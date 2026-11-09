"""
CareFlow HMS - Centralized Health Problem & Doctor Auto-Assignment Engine
Maps clinical complaints to required medical specializations and handles deterministic,
fair-distribution automatic doctor assignment.
"""
from datetime import datetime, time, timedelta
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from staff.models import Doctor, DoctorStatus


HEALTH_PROBLEMS = [
    {
        "id": "Fever",
        "label": "Fever",
        "description": "High body temperature, chills, sweating, or fever-related weakness.",
        "specialization": "General Physician",
    },
    {
        "id": "Cold and Cough",
        "label": "Cold and Cough",
        "description": "Runny nose, persistent coughing, sneezing, sore throat, or congestion.",
        "specialization": "General Physician",
    },
    {
        "id": "Headache",
        "label": "Headache",
        "description": "Tension headache, migraine, dizziness, or localized head pressure.",
        "specialization": "General Physician",
    },
    {
        "id": "Ear Pain",
        "label": "Ear Pain",
        "description": "Earache, hearing reduction, discharge, ringing, or ear fullness.",
        "specialization": "ENT Specialist",
    },
    {
        "id": "Eye Problems",
        "label": "Eye Problems",
        "description": "Blurred vision, eye pain, redness, irritation, or watering.",
        "specialization": "Ophthalmologist",
    },
    {
        "id": "Skin Problems",
        "label": "Skin Problems",
        "description": "Rashes, itching, allergic reactions, acne, or skin lesions.",
        "specialization": "Dermatologist",
    },
    {
        "id": "Heart-related Symptoms",
        "label": "Heart-related Symptoms",
        "description": "Mild palpitations, chest discomfort on exertion, or shortness of breath.",
        "specialization": "Cardiologist",
    },
    {
        "id": "Stomach Pain",
        "label": "Stomach Pain",
        "description": "Abdominal cramps, indigestion, acid reflux, nausea, or stomach ache.",
        "specialization": "General Physician",
    },
    {
        "id": "Bone and Joint Pain",
        "label": "Bone and Joint Pain",
        "description": "Joint stiffness, knee/back pain, muscle swelling, or mobility difficulty.",
        "specialization": "Orthopedic",
    },
    {
        "id": "Dental Problems",
        "label": "Dental Problems",
        "description": "Toothache, gum bleeding, tooth sensitivity, or oral discomfort.",
        "specialization": "Dentist",
    },
    {
        "id": "General Health Checkup",
        "label": "General Health Checkup",
        "description": "Routine medical assessment, wellness review, or preventive consultation.",
        "specialization": "General Physician",
    },
    {
        "id": "Other",
        "label": "Other",
        "description": "Unlisted symptoms or general medical complaints requiring physician review.",
        "specialization": "General Physician",
    },
]

HEALTH_PROBLEM_SPECIALIZATION_MAP = {
    item["id"]: item["specialization"] for item in HEALTH_PROBLEMS
}

SPECIALIZATION_ALIASES = {
    "General Physician": [
        "General Physician",
        "General Medicine",
        "Internal Medicine",
        "Family Medicine",
        "Physician",
    ],
    "ENT Specialist": [
        "ENT Specialist",
        "ENT",
        "Otolaryngology",
        "Otolaryngologist",
        "Ear, Nose & Throat",
    ],
    "Ophthalmologist": [
        "Ophthalmologist",
        "Ophthalmology",
        "Eye Specialist",
        "Optometry",
    ],
    "Dermatologist": [
        "Dermatologist",
        "Dermatology",
        "Skin Specialist",
    ],
    "Cardiologist": [
        "Cardiologist",
        "Cardiology",
        "Heart Specialist",
        "Cardiovascular",
    ],
    "Orthopedic": [
        "Orthopedic",
        "Orthopedics",
        "Orthopaedic",
        "Orthopaedics",
        "Orthopedic Surgeon",
        "Bone Specialist",
    ],
    "Dentist": [
        "Dentist",
        "Dental",
        "Dentistry",
        "Dental Surgeon",
        "Orthodontist",
    ],
}


def get_specialization_filter_q(target_spec):
    """
    Builds a flexible Django Q filter matching the target specialization or any of its known aliases.
    """
    q_filter = Q(specialization__iexact=target_spec)
    aliases = SPECIALIZATION_ALIASES.get(target_spec, [])
    for alias in aliases:
        q_filter |= Q(specialization__icontains=alias)
    return q_filter


def get_target_specialization(health_problem):
    """
    Returns the target specialization for a given health problem string.
    Defaults to 'General Physician' for any unlisted complaints.
    """
    if not health_problem:
        return "General Physician"
    return HEALTH_PROBLEM_SPECIALIZATION_MAP.get(health_problem.strip(), "General Physician")


def find_eligible_doctors_for_slot(health_problem, target_date, target_time):
    """
    Finds active doctors matching the problem specialization who:
    1. Are status ACTIVE.
    2. Have target_date's weekday in their available_days.
    3. Have target_time within their start_time and end_time.
    4. Do not have a conflicting active appointment in that slot.
    """
    from appointments.models import Appointment, AppointmentStatus

    target_spec = get_target_specialization(health_problem)
    spec_q = get_specialization_filter_q(target_spec)

    # 1. Active doctors matching specialization
    candidate_doctors = Doctor.objects.filter(status=DoctorStatus.ACTIVE).filter(spec_q)

    # 2. Filter by weekday availability
    weekday_name = target_date.strftime("%A").lower()
    valid_doctor_ids = []
    for doc in candidate_doctors:
        doc_days = [d.strip().lower() for d in (doc.available_days or "").split(",") if d.strip()]
        # If doctor has specific days listed, must include target weekday
        if doc_days and weekday_name not in doc_days:
            continue

        # Check working hours
        doc_start = doc.start_time or time(9, 0)
        doc_end = doc.end_time or time(17, 0)
        if not (doc_start <= target_time < doc_end):
            continue

        valid_doctor_ids.append(doc.id)

    if not valid_doctor_ids:
        return Doctor.objects.none()

    # 3. Exclude doctors with existing conflicting appointments
    conflicting_doc_ids = Appointment.objects.filter(
        doctor_id__in=valid_doctor_ids,
        appointment_date=target_date,
        appointment_time=target_time
    ).exclude(status=AppointmentStatus.CANCELLED).values_list("doctor_id", flat=True)

    available_doctor_ids = [d_id for d_id in valid_doctor_ids if d_id not in set(conflicting_doc_ids)]
    return Doctor.objects.filter(id__in=available_doctor_ids)


def assign_doctor_automatically(health_problem, target_date, target_time):
    """
    Automatically selects the best eligible doctor using fair workload distribution.
    When multiple eligible doctors are free, chooses the doctor with fewer active
    appointments on target_date, using doctor.id as a deterministic tie-breaker.

    Raises ValidationError with the user-mandated message if no doctor is available.
    """
    from appointments.models import AppointmentStatus

    eligible_doctors = find_eligible_doctors_for_slot(health_problem, target_date, target_time)

    if not eligible_doctors.exists():
        raise ValidationError({
            "detail": "No suitable doctor is available for your selected problem and appointment time. Please choose another date or time."
        })

    # Fair distribution: Count appointments on that specific date
    annotated = eligible_doctors.annotate(
        scheduled_load=Count(
            "appointments",
            filter=Q(
                appointments__appointment_date=target_date,
                appointments__status__in=[
                    AppointmentStatus.SCHEDULED,
                    AppointmentStatus.CONFIRMED,
                    AppointmentStatus.IN_PROGRESS,
                ],
            ),
        )
    ).order_by("scheduled_load", "id")

    return annotated.first()


def get_available_problem_slots(health_problem, target_date):
    """
    Calculates 30-minute time slots between 09:00 and 17:00 on target_date
    where AT LEAST ONE eligible doctor for the health problem is available.
    """
    from appointments.models import Appointment, AppointmentStatus

    target_spec = get_target_specialization(health_problem)
    spec_q = get_specialization_filter_q(target_spec)

    now_local = timezone.localtime(timezone.now())
    today = now_local.date()
    now_time = now_local.time()

    if target_date < today:
        return {
            "health_problem": health_problem,
            "specialization": target_spec,
            "date": target_date.strftime("%Y-%m-%d"),
            "is_available_day": False,
            "message": "Cannot book appointment slots for a past date.",
            "available_slots": [],
            "available_doctors_count": 0,
        }

    weekday_name = target_date.strftime("%A").lower()

    # Find active doctors for this specialization available on this weekday
    candidate_doctors = Doctor.objects.filter(status=DoctorStatus.ACTIVE).filter(spec_q)
    active_doctors_on_day = []
    for doc in candidate_doctors:
        doc_days = [d.strip().lower() for d in (doc.available_days or "").split(",") if d.strip()]
        if not doc_days or weekday_name in doc_days:
            active_doctors_on_day.append(doc)

    if not active_doctors_on_day:
        return {
            "health_problem": health_problem,
            "specialization": target_spec,
            "date": target_date.strftime("%Y-%m-%d"),
            "is_available_day": False,
            "message": f"No {target_spec} specialists are scheduled to practice on {target_date.strftime('%A')}s.",
            "available_slots": [],
            "available_doctors_count": 0,
        }

    # Generate standard 30-min clinical slots: 09:00 to 17:00
    start_t = time(9, 0)
    end_t = time(17, 0)
    slots = []
    curr = datetime.combine(target_date, start_t)
    end_dt = datetime.combine(target_date, end_t)

    while curr < end_dt:
        slot_time = curr.time()
        if target_date > today or slot_time > now_time:
            slots.append(slot_time)
        curr += timedelta(minutes=30)

    # For each slot, check if at least one doctor is free
    active_doc_ids = [d.id for d in active_doctors_on_day]
    busy_appointments = Appointment.objects.filter(
        doctor_id__in=active_doc_ids,
        appointment_date=target_date
    ).exclude(status=AppointmentStatus.CANCELLED).values_list("doctor_id", "appointment_time")

    busy_map = {}
    for doc_id, apt_time in busy_appointments:
        t_key = apt_time.strftime("%H:%M:%S")
        if t_key not in busy_map:
            busy_map[t_key] = set()
        busy_map[t_key].add(doc_id)

    available_slot_strings = []
    total_doc_count = len(active_doc_ids)

    for slot in slots:
        t_str = slot.strftime("%H:%M:%S")
        busy_docs_for_slot = busy_map.get(t_str, set())
        # If not all doctors are busy, this slot is available!
        if len(busy_docs_for_slot) < total_doc_count:
            available_slot_strings.append(t_str)

    msg = None
    if not available_slot_strings:
        msg = f"All {target_spec} appointment slots are currently booked for this date. Please choose another date."

    return {
        "health_problem": health_problem,
        "specialization": target_spec,
        "date": target_date.strftime("%Y-%m-%d"),
        "is_available_day": True,
        "message": msg,
        "available_slots": available_slot_strings,
        "available_doctors_count": total_doc_count,
    }

