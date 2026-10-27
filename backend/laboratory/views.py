import os
import mimetypes
from django.utils import timezone
from django.http import FileResponse, Http404
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from drf_spectacular.utils import extend_schema, extend_schema_view
from accounts.models import UserRole
from accounts.permissions import get_user_role
from .models import LabTest, LabOrder, LabOrderStatus
from .serializers import LabTestSerializer, LabOrderSerializer
from .validators import validate_lab_report_file
from accounts.emails import send_lab_report_email, send_lab_report_email_async


@extend_schema_view(
    list=extend_schema(summary="List diagnostic tests in laboratory catalogue"),
    retrieve=extend_schema(summary="Retrieve laboratory test details"),
    create=extend_schema(summary="Add test to catalogue (Admin or Lab Staff)"),
    update=extend_schema(summary="Update laboratory test details"),
    partial_update=extend_schema(summary="Partial update laboratory test"),
    destroy=extend_schema(summary="Deactivate laboratory test"),
)
class LabTestViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Laboratory Test Catalogue.
    - Admin & Lab Staff: Manage catalogue.
    - Doctors & Receptionists: Read-only access to catalogue for ordering.
    """
    queryset = LabTest.objects.all()
    serializer_class = LabTestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["category", "is_active"]
    search_fields = ["test_code", "test_name", "description"]
    ordering_fields = ["test_name", "price"]

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role not in (UserRole.ADMIN, UserRole.LAB_STAFF) and not user.is_superuser:
            raise PermissionDenied("Only Laboratory Staff and Administrators can manage diagnostic test catalogues.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role not in (UserRole.ADMIN, UserRole.LAB_STAFF) and not user.is_superuser:
            raise PermissionDenied("Only Laboratory Staff and Administrators can modify diagnostic tests.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        role = get_user_role(user)
        if role != UserRole.ADMIN and not user.is_superuser:
            raise PermissionDenied("Only Administrators can deactivate or remove diagnostic tests.")
        instance.is_active = False
        instance.save(update_fields=["is_active"])


@extend_schema_view(
    list=extend_schema(summary="List laboratory test orders"),
    retrieve=extend_schema(summary="Retrieve laboratory order details"),
    create=extend_schema(summary="Order laboratory test (Doctor only)"),
    update=extend_schema(summary="Update laboratory test order"),
    partial_update=extend_schema(summary="Update status / results (Lab Staff)"),
    destroy=extend_schema(summary="Cancel laboratory order"),
)
class LabOrderViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Laboratory Orders & Results Workflow.
    - Doctor: Order diagnostic tests for connected patients, request cancellation.
    - Admin: Read-only access to laboratory reports and metadata. Cannot modify orders/results.
    - Lab Staff: View orders, collect specimens, update test status, record/upload results, process cancellations.
    - Patient: View only their own test results and reports. Cannot modify clinical orders.
    """
    queryset = LabOrder.objects.all()
    serializer_class = LabOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "patient", "doctor", "test", "cancellation_requested"]
    search_fields = ["order_id", "patient__first_name", "patient__last_name", "doctor__first_name", "doctor__last_name", "test__test_name", "test__test_code"]
    ordering_fields = ["ordered_at", "completed_at", "status", "order_id"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)

        base_qs = LabOrder.objects.select_related(
            "patient", "doctor", "test", "assigned_staff", "cancelled_by"
        )

        if role in (UserRole.ADMIN, UserRole.LAB_STAFF) or user.is_superuser:
            return base_qs.all()
        elif role == UserRole.DOCTOR:
            return base_qs.filter(doctor__user=user)
        elif role == UserRole.PATIENT:
            return base_qs.filter(patient__user=user)
        return LabOrder.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)

        # Enforce Rule: Admin cannot perform doctor-only treatment activities
        if role == UserRole.ADMIN or user.is_superuser:
            raise PermissionDenied(
                "Administrators cannot order clinical laboratory tests. "
                "Diagnostic test orders must be initiated by an authorized Doctor."
            )

        if role != UserRole.DOCTOR:
            raise PermissionDenied("Only Doctors can order laboratory tests.")

        # Ensure doctor identity
        doctor = getattr(user, "doctor_profile", None)
        if not doctor:
            raise ValidationError("Authenticated doctor profile not found.")

        # Doctor can only create requests for checked-in patients assigned to their care
        patient = serializer.validated_data.get("patient")
        if not patient:
            raise ValidationError({"patient": "A valid patient is required to order a laboratory test."})

        from appointments.models import Appointment, AppointmentStatus
        terminal_statuses = [
            AppointmentStatus.CANCELLED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.NO_SHOW,
        ]
        if hasattr(AppointmentStatus, "CHECKED_OUT"):
            terminal_statuses.append(AppointmentStatus.CHECKED_OUT)

        provided_appointment = serializer.validated_data.get("appointment")
        if provided_appointment:
            if provided_appointment.doctor != doctor:
                raise ValidationError({"appointment": "The specified appointment is not assigned to you."})
            if provided_appointment.patient != patient:
                raise ValidationError({"appointment": "The specified appointment does not belong to this patient."})
            if not provided_appointment.is_checked_in:
                raise ValidationError({
                    "appointment": "Laboratory orders can only be created for checked-in appointments. The patient has not checked in for this appointment."
                })
            if provided_appointment.status in terminal_statuses:
                raise ValidationError({
                    "appointment": "Laboratory orders cannot be created after patient checkout or completion of the appointment."
                })
            target_appointment = provided_appointment
        else:
            checked_in_apt = Appointment.objects.filter(
                doctor=doctor,
                patient=patient,
                is_checked_in=True
            ).exclude(status__in=terminal_statuses).order_by("-appointment_date", "-appointment_time").first()

            if not checked_in_apt:
                raise ValidationError({
                    "patient": "Doctors can only order laboratory tests for checked-in patients assigned to their care. Lab orders cannot be created after patient checkout or completion."
                })
            target_appointment = checked_in_apt

        # Prevent duplicate / second-time lab order for this consultation
        existing_order = LabOrder.objects.filter(
            appointment=target_appointment
        ).exclude(status=LabOrderStatus.CANCELLED).first()
        if existing_order:
            raise ValidationError({
                "appointment": f"A laboratory test request ({existing_order.order_id}) has already been ordered for this consultation. A second lab request cannot be accessed or created."
            })

        serializer.save(doctor=doctor, appointment=target_appointment, status=LabOrderStatus.REQUESTED)

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        instance = serializer.instance

        if role == UserRole.PATIENT:
            raise PermissionDenied("Patients cannot modify laboratory orders or upload test results.")

        # Admin is strictly read-only for laboratory orders and reports
        if role == UserRole.ADMIN:
            raise PermissionDenied(
                "Administrators have read-only access to laboratory records and cannot modify orders, statuses, results, or reports."
            )

        has_file_upload = "report_file" in self.request.FILES or "report_file" in self.request.data
        has_result_data = "result_value" in self.request.data or "result_notes" in self.request.data or "result_interpretation" in self.request.data

        if role == UserRole.DOCTOR:
            if instance.doctor.user != user and not user.is_superuser:
                raise PermissionDenied("Doctors can only manage their own orders.")

            # Doctors cannot directly change status to Cancelled or modify laboratory processing workflow
            if "status" in self.request.data:
                raise PermissionDenied(
                    "Doctors cannot change laboratory processing statuses or directly cancel tests. "
                    "Please submit a cancellation request through the cancellation workflow."
                )

            if has_file_upload or has_result_data:
                raise PermissionDenied("Only Laboratory Staff can enter results or upload diagnostic reports.")

            # Doctor can only update clinical notes
            serializer.save()
            return

        if role == UserRole.LAB_STAFF or user.is_superuser:
            new_status = self.request.data.get("status")
            current_status = instance.status

            if current_status in (LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED):
                if new_status and new_status != current_status:
                    raise ValidationError({
                        "status": f"Completed or cancelled tests cannot be reopened or transitioned. Current status: {current_status}."
                    })
                raise ValidationError({
                    "detail": f"This laboratory test is {current_status.lower()} and its verified records cannot be modified."
                })

            if new_status and new_status != current_status:
                # Valid transitions:
                # REQUESTED/ORDERED -> ACCEPTED, CANCELLED
                # ACCEPTED/SAMPLE_COLLECTED -> IN_PROGRESS, CANCELLED
                # IN_PROGRESS -> COMPLETED, CANCELLED
                # COMPLETED -> terminal
                # CANCELLED -> terminal
                VALID_TRANSITIONS = {
                    LabOrderStatus.REQUESTED: [LabOrderStatus.ACCEPTED, LabOrderStatus.CANCELLED],
                    LabOrderStatus.ORDERED: [LabOrderStatus.ACCEPTED, LabOrderStatus.SAMPLE_COLLECTED, LabOrderStatus.CANCELLED],
                    LabOrderStatus.ACCEPTED: [LabOrderStatus.IN_PROGRESS, LabOrderStatus.CANCELLED],
                    LabOrderStatus.SAMPLE_COLLECTED: [LabOrderStatus.IN_PROGRESS, LabOrderStatus.CANCELLED],
                    LabOrderStatus.IN_PROGRESS: [LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED],
                    LabOrderStatus.COMPLETED: [],
                    LabOrderStatus.CANCELLED: [],
                }

                if current_status in (LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED):
                    raise ValidationError({
                        "status": f"Completed or cancelled tests cannot be reopened or transitioned. Current status: {current_status}."
                    })

                allowed = VALID_TRANSITIONS.get(current_status, [])
                if new_status not in allowed:
                    raise ValidationError({
                        "status": f"Invalid status transition from '{current_status}' to '{new_status}'."
                    })

                if new_status == LabOrderStatus.COMPLETED:
                    # Require results or report
                    has_result = (
                        bool(self.request.data.get("result_value")) or
                        bool(instance.result_value) or
                        has_file_upload or
                        bool(instance.report_file)
                    )
                    if not has_result:
                        raise ValidationError({
                            "result_value": "A test cannot be marked as Completed without recording test results or uploading a report file."
                        })

            extra_kwargs = {"assigned_staff": user}
            if new_status == LabOrderStatus.COMPLETED or has_file_upload:
                extra_kwargs["completed_at"] = timezone.now()
            elif new_status == LabOrderStatus.SAMPLE_COLLECTED:
                extra_kwargs["sample_collected_at"] = timezone.now()
            elif new_status == LabOrderStatus.CANCELLED:
                extra_kwargs["cancellation_status"] = "APPROVED"
                extra_kwargs["cancellation_processed_at"] = timezone.now()
                extra_kwargs["cancelled_by"] = user

            serializer.save(**extra_kwargs)
            return

        raise PermissionDenied("You do not have permission to modify this laboratory order.")

    def perform_destroy(self, instance):
        user = self.request.user
        role = get_user_role(user)

        if role == UserRole.ADMIN:
            raise PermissionDenied("Administrators cannot delete laboratory orders.")

        if role == UserRole.PATIENT:
            raise PermissionDenied("Patients cannot delete laboratory orders.")

        if role == UserRole.DOCTOR:
            raise PermissionDenied(
                "Doctors cannot directly delete or cancel laboratory orders. "
                "Please submit a cancellation request."
            )

        if role == UserRole.LAB_STAFF or user.is_superuser:
            if instance.status == LabOrderStatus.COMPLETED:
                raise ValidationError({"detail": "Completed laboratory orders cannot be deleted or cancelled."})
            instance.delete()
            return

        raise PermissionDenied("You do not have permission to delete this laboratory order.")

    @action(detail=True, methods=["post"], url_path="request-cancellation")
    def request_cancellation(self, request, pk=None):
        """
        Allows an authorized Doctor to submit a cancellation request for an eligible test.
        Does not directly cancel the test; records the request for laboratory processing.
        """
        order = self.get_object()
        user = request.user
        role = get_user_role(user)

        if role != UserRole.DOCTOR and not user.is_superuser:
            raise PermissionDenied("Only the ordering Doctor can request test cancellation.")

        if order.doctor.user != user and not user.is_superuser:
            raise PermissionDenied("Doctors can only request cancellation for their own orders.")

        if order.status in (LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED):
            raise ValidationError({
                "detail": f"Cannot request cancellation for an order that is already {order.get_status_display().lower()}."
            })

        if order.cancellation_requested and order.cancellation_status == "REQUESTED":
            raise ValidationError({
                "detail": "A cancellation request is already pending laboratory processing for this order."
            })

        reason = request.data.get("reason", "").strip()
        if not reason:
            raise ValidationError({"reason": "A cancellation reason is required."})

        order.cancellation_requested = True
        order.cancellation_reason = reason
        order.cancellation_requested_at = timezone.now()
        order.cancellation_status = "REQUESTED"
        order.save(update_fields=[
            "cancellation_requested",
            "cancellation_reason",
            "cancellation_requested_at",
            "cancellation_status",
            "updated_at",
        ])

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="process-cancellation")
    def process_cancellation(self, request, pk=None):
        """
        Allows Laboratory Staff to approve or reject a doctor's cancellation request.
        """
        order = self.get_object()
        user = request.user
        role = get_user_role(user)

        if role != UserRole.LAB_STAFF and not user.is_superuser:
            raise PermissionDenied("Only Laboratory Staff can process cancellation requests.")

        if order.status in (LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED):
            raise ValidationError({
                "detail": f"Cannot process cancellation for an order with status {order.get_status_display()}."
            })

        decision = request.data.get("decision", "").strip().upper()
        remarks = request.data.get("remarks", "").strip()

        if decision not in ("APPROVE", "REJECT"):
            raise ValidationError({"decision": "Decision must be either 'APPROVE' or 'REJECT'."})

        if decision == "APPROVE":
            order.status = LabOrderStatus.CANCELLED
            order.cancellation_status = "APPROVED"
            order.cancellation_remarks = remarks
            order.cancellation_processed_at = timezone.now()
            order.cancelled_by = user
            order.save(update_fields=[
                "status",
                "cancellation_status",
                "cancellation_remarks",
                "cancellation_processed_at",
                "cancelled_by",
                "updated_at",
            ])
        else:
            order.cancellation_requested = False
            order.cancellation_status = "REJECTED"
            order.cancellation_remarks = remarks
            order.cancellation_processed_at = timezone.now()
            order.save(update_fields=[
                "cancellation_requested",
                "cancellation_status",
                "cancellation_remarks",
                "cancellation_processed_at",
                "updated_at",
            ])

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="download-report")
    def download_report(self, request, pk=None):
        """
        Secure, authorized endpoint to retrieve or download the attached laboratory report.
        Strictly verifies that caller is the patient, requesting doctor, lab staff, or admin.
        """
        try:
            order = LabOrder.objects.select_related("doctor", "patient").get(pk=pk)
        except LabOrder.DoesNotExist:
            raise NotFound("Laboratory order not found.")

        user = request.user
        role = get_user_role(user)

        # Enforce authorized access
        is_authorized = False
        if role in (UserRole.ADMIN, UserRole.LAB_STAFF) or user.is_superuser:
            is_authorized = True
        elif role == UserRole.DOCTOR and order.doctor.user == user:
            is_authorized = True
        elif role == UserRole.PATIENT and order.patient.user == user:
            is_authorized = True

        if not is_authorized:
            raise PermissionDenied("You do not have permission to view or download this diagnostic report.")

        if not order.report_file:
            raise NotFound("No diagnostic report file is attached to this laboratory order.")

        try:
            file_handle = order.report_file.open("rb")
        except Exception:
            raise NotFound("Diagnostic report file could not be read from storage.")

        filename = os.path.basename(order.report_file.name)
        mime_type, _ = mimetypes.guess_type(filename)
        if not mime_type:
            mime_type = "application/octet-stream"

        response = FileResponse(file_handle, content_type=mime_type)
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """
        Real database statistics for the Laboratory Staff Overview dashboard.
        Returns actual PostgreSQL counts of orders by status, pending cancellations, and reports.
        """
        user = request.user
        role = get_user_role(user)
        if role not in (UserRole.ADMIN, UserRole.LAB_STAFF) and not user.is_superuser:
            raise PermissionDenied("Only Laboratory Staff and Administrators can view laboratory statistics.")

        qs = LabOrder.objects.all()
        total = qs.count()
        requested = qs.filter(status__in=[LabOrderStatus.REQUESTED, LabOrderStatus.ORDERED]).count()
        accepted = qs.filter(status__in=[LabOrderStatus.ACCEPTED, LabOrderStatus.SAMPLE_COLLECTED]).count()
        in_progress = qs.filter(status=LabOrderStatus.IN_PROGRESS).count()
        completed = qs.filter(status=LabOrderStatus.COMPLETED).count()
        cancelled = qs.filter(status=LabOrderStatus.CANCELLED).count()
        pending_cancellations = qs.filter(cancellation_requested=True, cancellation_status="REQUESTED").count()
        reports_uploaded = qs.exclude(report_file="").exclude(report_file__isnull=True).count()

        return Response({
            "total": total,
            "requested": requested,
            "accepted": accepted,
            "in_progress": in_progress,
            "completed": completed,
            "cancelled": cancelled,
            "pending_cancellations": pending_cancellations,
            "reports_uploaded": reports_uploaded,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="upload-report")
    def upload_report(self, request, pk=None):
        """
        Allows Laboratory Staff to upload or replace a diagnostic report file.
        Validates file size (max 5MB) and type (PDF, JPEG, PNG).
        """
        order = self.get_object()
        user = request.user
        role = get_user_role(user)

        if role != UserRole.LAB_STAFF and not user.is_superuser:
            raise PermissionDenied("Only Laboratory Staff can upload diagnostic reports.")

        if order.status == LabOrderStatus.CANCELLED:
            raise ValidationError({"detail": "Cannot upload reports to a cancelled order."})

        if order.status == LabOrderStatus.COMPLETED:
            raise ValidationError({"detail": "Cannot upload or replace reports on a completed and locked test order."})

        file = request.FILES.get("report_file")
        if not file:
            raise ValidationError({"report_file": "Please provide a valid report file (PDF, JPG, or PNG)."})

        validate_lab_report_file(file)

        order.report_file = file
        order.assigned_staff = user

        mark_completed = request.data.get("mark_completed", "false").lower() in ("true", "1")
        if mark_completed:
            order.status = LabOrderStatus.COMPLETED
            order.completed_at = timezone.now()

        order.save()

        # Send diagnostic report email to patient asynchronously
        if mark_completed or order.status == LabOrderStatus.COMPLETED:
            send_lab_report_email_async(order=order)

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="send-email")
    def send_email(self, request, pk=None):
        """
        Sends the diagnostic test report directly to the patient's email address.
        Accessible by Patient (own report), Doctor, Lab Staff, or Admin.
        """
        order = self.get_object()
        user = request.user
        role = get_user_role(user)

        # Enforce authorized access
        is_authorized = False
        if role in (UserRole.ADMIN, UserRole.LAB_STAFF) or user.is_superuser:
            is_authorized = True
        elif role == UserRole.DOCTOR and order.doctor.user == user:
            is_authorized = True
        elif role == UserRole.PATIENT and order.patient.user == user:
            is_authorized = True

        if not is_authorized:
            raise PermissionDenied("You do not have permission to email this report.")

        custom_email = request.data.get("email")
        res = send_lab_report_email(order, recipient_email=custom_email)
        return Response(res, status=status.HTTP_200_OK if res.get("success") else status.HTTP_400_BAD_REQUEST)

