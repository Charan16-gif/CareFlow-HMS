from django.core.management.base import BaseCommand
from config.backup_manager import restore_database_backup
from accounts.models import DatabaseBackupRecord


class Command(BaseCommand):
    help = "Safely restores a CareFlow HMS PostgreSQL database backup with strict safeguards and pre-restore snapshots."

    def add_arguments(self, parser):
        parser.add_argument(
            "filename_or_id",
            type=str,
            help="Filename (e.g. careflow_backup_20261102_120000.dump) or backup record ID to restore.",
        )
        parser.add_argument(
            "--confirm",
            type=str,
            required=True,
            help="Confirmation phrase matching 'RESTORE-CONFIRM-<filename>' to prevent accidental destruction.",
        )
        parser.add_argument(
            "--target-db",
            type=str,
            default=None,
            help="Optional target database name if restoring to a test/isolated database.",
        )

    def handle(self, *args, **options):
        target = options["filename_or_id"]
        confirm = options["confirm"]
        target_db = options.get("target_db")

        self.stdout.write(self.style.WARNING(f"Attempting to restore CareFlow HMS database from: {target}"))

        success, message = restore_database_backup(
            backup_record_or_id=target,
            user=None,
            confirmation_phrase=confirm,
            target_db=target_db,
        )

        if success:
            self.stdout.write(self.style.SUCCESS(f"Restoration Complete:\n{message}"))
        else:
            self.stderr.write(self.style.ERROR(f"Restoration Aborted: {message}"))
            raise SystemExit(1)

