from django.core.management.base import BaseCommand
from config.backup_manager import create_database_backup, apply_retention_policy


class Command(BaseCommand):
    help = "Creates a verified PostgreSQL database backup for CareFlow HMS and applies retention policies."

    def add_arguments(self, parser):
        parser.add_argument(
            "--automated",
            action="store_true",
            help="Flags this backup as triggered by an automated scheduler or cron job.",
        )
        parser.add_argument(
            "--note",
            type=str,
            default="",
            help="Optional explanatory note recorded with the backup audit entry.",
        )

    def handle(self, *args, **options):
        is_automated = options.get("automated", False)
        note = options.get("note", "")

        self.stdout.write(self.style.NOTICE("Initiating CareFlow HMS PostgreSQL database backup..."))

        success, message, record = create_database_backup(
            user=None,
            is_automated=is_automated,
            notes=note or ("Automated scheduled backup" if is_automated else "CLI manual backup"),
        )

        if success:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Backup successfully generated: {record.filename}\n"
                    f"Path: {record.file_path}\n"
                    f"Size: {record.file_size_display}\n"
                    f"SHA256: {record.sha256_checksum}\n"
                    f"Integrity verified: OK"
                )
            )
        else:
            self.stderr.write(self.style.ERROR(f"Backup failed: {message}"))
            raise SystemExit(1)

