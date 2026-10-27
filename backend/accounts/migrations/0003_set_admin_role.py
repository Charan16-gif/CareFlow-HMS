from django.db import migrations


def set_initial_admin_role(apps, schema_editor):
    UserProfile = apps.get_model("accounts", "UserProfile")
    User = apps.get_model("auth", "User")
    # Assign the single admin role to the existing superuser
    superusers = User.objects.filter(is_superuser=True)
    for u in superusers:
        UserProfile.objects.filter(user=u).update(role="ADMIN")


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_alter_userprofile_options_userprofile_role"),
    ]

    operations = [
        migrations.RunPython(set_initial_admin_role, reverse_func),
    ]
