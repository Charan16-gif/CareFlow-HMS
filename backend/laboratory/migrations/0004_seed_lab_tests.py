from decimal import Decimal
from django.db import migrations


def seed_standard_lab_tests(apps, schema_editor):
    LabTest = apps.get_model("laboratory", "LabTest")
    if LabTest.objects.exists():
        return

    standard_tests = [
        {
            "test_code": "LAB-101",
            "test_name": "Complete Blood Count (CBC)",
            "category": "HEMATOLOGY",
            "description": "Comprehensive panel measuring white blood cells, red blood cells, hemoglobin, hematocrit, and platelets.",
            "price": Decimal("35.00"),
            "reference_range": "Hemoglobin: 13.5 - 17.5 g/dL, WBC: 4.5 - 11.0 x10^3/uL",
            "unit": "g/dL",
            "turnaround_time": "2 Hours",
            "is_active": True,
        },
        {
            "test_code": "LAB-102",
            "test_name": "Comprehensive Metabolic Panel (CMP)",
            "category": "BIOCHEMISTRY",
            "description": "Measures 14 substances including glucose, electrolytes, kidney, and liver markers.",
            "price": Decimal("55.00"),
            "reference_range": "Standard clinical thresholds",
            "unit": "mg/dL",
            "turnaround_time": "4 Hours",
            "is_active": True,
        },
        {
            "test_code": "LAB-103",
            "test_name": "Lipid Profile Panel",
            "category": "BIOCHEMISTRY",
            "description": "Cholesterol, Triglycerides, HDL, LDL, and VLDL evaluation for cardiovascular risk.",
            "price": Decimal("40.00"),
            "reference_range": "Total Cholesterol < 200 mg/dL, Triglycerides < 150 mg/dL",
            "unit": "mg/dL",
            "turnaround_time": "4 Hours",
            "is_active": True,
        },
        {
            "test_code": "LAB-104",
            "test_name": "Fasting Blood Glucose (FBG)",
            "category": "BIOCHEMISTRY",
            "description": "Measures blood sugar level after fasting to assess diabetic status.",
            "price": Decimal("20.00"),
            "reference_range": "70 - 99 mg/dL",
            "unit": "mg/dL",
            "turnaround_time": "1 Hour",
            "is_active": True,
        },
        {
            "test_code": "LAB-105",
            "test_name": "Hemoglobin A1c (HbA1c)",
            "category": "BIOCHEMISTRY",
            "description": "Average blood sugar control over past 2 to 3 months.",
            "price": Decimal("45.00"),
            "reference_range": "4.0 - 5.6 % (Normal)",
            "unit": "%",
            "turnaround_time": "3 Hours",
            "is_active": True,
        },
        {
            "test_code": "LAB-106",
            "test_name": "Urinalysis Complete",
            "category": "URINALYSIS",
            "description": "Physical, chemical, and microscopic evaluation of urine for kidney or metabolic disorders.",
            "price": Decimal("25.00"),
            "reference_range": "Negative for protein, glucose, ketones; pH 5.0 - 8.0",
            "unit": "qualitative",
            "turnaround_time": "1 Hour",
            "is_active": True,
        },
        {
            "test_code": "LAB-107",
            "test_name": "Thyroid Stimulating Hormone (TSH)",
            "category": "IMMUNOLOGY",
            "description": "Screening for thyroid dysfunction (hypothyroidism / hyperthyroidism).",
            "price": Decimal("50.00"),
            "reference_range": "0.4 - 4.0 mIU/L",
            "unit": "mIU/L",
            "turnaround_time": "6 Hours",
            "is_active": True,
        },
        {
            "test_code": "LAB-108",
            "test_name": "Liver Function Test (LFT)",
            "category": "BIOCHEMISTRY",
            "description": "Enzyme and protein levels (ALT, AST, ALP, Bilirubin, Albumin) reflecting liver health.",
            "price": Decimal("60.00"),
            "reference_range": "ALT: 7 - 56 U/L, AST: 10 - 40 U/L, Total Bilirubin: 0.1 - 1.2 mg/dL",
            "unit": "U/L",
            "turnaround_time": "4 Hours",
            "is_active": True,
        },
        {
            "test_code": "LAB-109",
            "test_name": "Renal Function Test (RFT / BUN & Creatinine)",
            "category": "BIOCHEMISTRY",
            "description": "Serum creatinine, Blood Urea Nitrogen (BUN), and eGFR to evaluate kidney filtration.",
            "price": Decimal("50.00"),
            "reference_range": "Creatinine: 0.7 - 1.3 mg/dL, BUN: 7 - 20 mg/dL",
            "unit": "mg/dL",
            "turnaround_time": "3 Hours",
            "is_active": True,
        },
        {
            "test_code": "LAB-110",
            "test_name": "Chest X-Ray (PA & Lateral)",
            "category": "RADIOLOGY",
            "description": "Diagnostic radiographic imaging of chest cavity, lungs, and heart contours.",
            "price": Decimal("80.00"),
            "reference_range": "Clear lung fields, normal cardiothoracic ratio, no infiltrates",
            "unit": "visual",
            "turnaround_time": "2 Hours",
            "is_active": True,
        },
        {
            "test_code": "LAB-111",
            "test_name": "Urine Culture & Sensitivity",
            "category": "MICROBIOLOGY",
            "description": "Identifies bacterial pathogens in urine and tests antibiotic susceptibility.",
            "price": Decimal("65.00"),
            "reference_range": "No significant bacterial growth at 48 hours (< 10,000 CFU/mL)",
            "unit": "CFU/mL",
            "turnaround_time": "48 Hours",
            "is_active": True,
        },
        {
            "test_code": "LAB-112",
            "test_name": "Coagulation Profile (PT / INR)",
            "category": "HEMATOLOGY",
            "description": "Prothrombin Time and International Normalized Ratio assessing blood clotting efficiency.",
            "price": Decimal("30.00"),
            "reference_range": "INR: 0.9 - 1.1, PT: 11.0 - 13.5 seconds",
            "unit": "INR",
            "turnaround_time": "2 Hours",
            "is_active": True,
        },
    ]

    for item in standard_tests:
        LabTest.objects.create(**item)


def reverse_seed(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("laboratory", "0003_laborder_cancellation_processed_at_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_standard_lab_tests, reverse_seed),
    ]
