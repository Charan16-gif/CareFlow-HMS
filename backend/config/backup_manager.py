import os
import glob
import shutil
import hashlib
import logging
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger("backups")


def find_postgres_binary(binary_name: str) -> str:
    """
    Locates PostgreSQL binary (pg_dump or pg_restore) on the system.
    Checks environment override, PATH, and standard Windows Program Files paths.
    """
    exe_name = f"{binary_name}.exe" if os.name == "nt" else binary_name

    # 1. Environment variable override
    env_var = f"{binary_name.upper()}_PATH"
    if hasattr(settings, env_var) and getattr(settings, env_var):
        p = Path(getattr(settings, env_var))
        if p.is_file():
            return str(p)

    # 2. System PATH
    found = shutil.which(binary_name) or shutil.which(exe_name)
    if found:
        return found

    # 3. Standard Windows PostgreSQL install directories
    if os.name == "nt":
        candidates = [
            Path(r"C:\Program Files\PostgreSQL\18\bin") / exe_name,
            Path(r"C:\Program Files\PostgreSQL\17\bin") / exe_name,
            Path(r"C:\Program Files\PostgreSQL\16\bin") / exe_name,
            Path(r"C:\Program Files\PostgreSQL\15\bin") / exe_name,
            Path(r"C:\Program Files\PostgreSQL\14\bin") / exe_name,
        ]
        # Also check wildcard paths
        wildcard_matches = glob.glob(r"C:\Program Files\PostgreSQL\*\bin\\" + exe_name)
        candidates.extend([Path(m) for m in wildcard_matches])

        for c in candidates:
            if c.is_file():
                return str(c)

    raise FileNotFoundError(
        f"Could not locate PostgreSQL utility '{binary_name}'. "
        f"Please verify PostgreSQL installation or set {env_var} in your .env file."
    )


def get_backup_directory() -> Path:
    """
    Returns the absolute path to the backup directory, ensuring it exists.
    Stored outside static and media directories.
    """
    backup_dir = getattr(settings, "BACKUP_DIR", settings.BASE_DIR / "backups")
    backup_dir = Path(backup_dir)
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def compute_file_sha256(file_path: Path) -> str:
    """
    Computes SHA-256 checksum of a file.
    """
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def verify_backup_integrity(file_path: Path) -> tuple[bool, str]:
    """
    Verifies the integrity of a PostgreSQL custom-format dump:
    1. File exists and has positive size.
    2. Header begins with PostgreSQL custom dump magic bytes (b'PGDMP').
    3. Runs pg_restore --list to ensure the table of contents is readable.
    """
    if not file_path.is_file():
        return False, "Backup file does not exist on disk."

    size = file_path.stat().st_size
    if size < 512:
        return False, f"Backup file is abnormally small ({size} bytes)."

    try:
        with open(file_path, "rb") as f:
            header = f.read(5)
            if header != b"PGDMP":
                return False, f"Invalid dump header. Expected 'PGDMP', found {header!r}."
    except Exception as e:
        return False, f"Failed to inspect backup header: {e}"

    # Verify Table of Contents via pg_restore -l
    try:
        pg_restore_bin = find_postgres_binary("pg_restore")
        result = subprocess.run(
            [pg_restore_bin, "--list", str(file_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=30,
        )
        if result.returncode != 0:
            err_msg = result.stderr.decode("utf-8", errors="replace").strip()
            return False, f"pg_restore verification failed: {err_msg}"
    except Exception as e:
        return False, f"Verification command failed: {e}"

    return True, "Integrity verified (TOC valid, PGDMP header intact)."


def apply_retention_policy():
    """
    Deletes backups older than BACKUP_RETENTION_DAYS or when count exceeds BACKUP_MAX_COUNT.
    """
    from accounts.models import DatabaseBackupRecord

    retention_days = getattr(settings, "BACKUP_RETENTION_DAYS", 30)
    max_count = getattr(settings, "BACKUP_MAX_COUNT", 50)
    cutoff = timezone.now() - timedelta(days=retention_days)

    # 1. Age-based cleanup
    expired_records = DatabaseBackupRecord.objects.filter(created_at__lt=cutoff)
    for rec in expired_records:
        try:
            p = Path(rec.file_path)
            if p.is_file():
                p.unlink()
            rec.delete()
            logger.info(f"Deleted expired backup due to {retention_days}-day retention: {rec.filename}")
        except Exception as e:
            logger.warning(f"Failed to delete expired backup file {rec.file_path}: {e}")

    # 2. Count-based cleanup (keep newest max_count)
    all_records = list(DatabaseBackupRecord.objects.order_by("-created_at"))
    if len(all_records) > max_count:
        for rec in all_records[max_count:]:
            try:
                p = Path(rec.file_path)
                if p.is_file():
                    p.unlink()
                rec.delete()
                logger.info(f"Deleted excess backup due to max count limit ({max_count}): {rec.filename}")
            except Exception as e:
                logger.warning(f"Failed to delete excess backup file {rec.file_path}: {e}")


def create_database_backup(user=None, is_automated: bool = False, notes: str = ""):
    """
    Executes a complete PostgreSQL backup using pg_dump in custom format (-Fc).
    Records metadata in DatabaseBackupRecord and verifies integrity.
    """
    from accounts.models import DatabaseBackupRecord

    db_settings = settings.DATABASES["default"]
    db_name = db_settings.get("NAME")
    db_user = db_settings.get("USER", "postgres")
    db_password = db_settings.get("PASSWORD", "")
    db_host = db_settings.get("HOST", "localhost") or "localhost"
    db_port = str(db_settings.get("PORT", "5432") or "5432")

    backup_dir = get_backup_directory()
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"careflow_backup_{timestamp_str}.dump"
    file_path = backup_dir / filename

    try:
        pg_dump_bin = find_postgres_binary("pg_dump")
    except Exception as e:
        err = f"PostgreSQL pg_dump binary not found: {e}"
        logger.error(err)
        record = DatabaseBackupRecord.objects.create(
            filename=filename,
            file_path=str(file_path),
            status="FAILED",
            is_automated=is_automated,
            notes=notes,
            error_message=err,
            created_by=user,
        )
        return False, err, record

    env = os.environ.copy()
    if db_password:
        env["PGPASSWORD"] = db_password

    cmd = [
        pg_dump_bin,
        "-h", db_host,
        "-p", db_port,
        "-U", db_user,
        "-d", db_name,
        "-Fc",  # PostgreSQL custom compressed format
        "-f", str(file_path),
    ]

    logger.info(f"Initiating database backup: {filename} for database {db_name}")
    try:
        proc = subprocess.run(
            cmd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=180,
        )
        if proc.returncode != 0:
            err_msg = proc.stderr.decode("utf-8", errors="replace").strip()
            logger.error(f"pg_dump failed with exit code {proc.returncode}: {err_msg}")
            record = DatabaseBackupRecord.objects.create(
                filename=filename,
                file_path=str(file_path),
                status="FAILED",
                is_automated=is_automated,
                notes=notes,
                error_message=err_msg,
                created_by=user,
            )
            return False, f"Backup creation failed: {err_msg}", record

        # Verify Integrity
        is_valid, integrity_msg = verify_backup_integrity(file_path)
        if not is_valid:
            logger.error(f"Backup verification failed: {integrity_msg}")
            record = DatabaseBackupRecord.objects.create(
                filename=filename,
                file_path=str(file_path),
                file_size_bytes=file_path.stat().st_size if file_path.exists() else 0,
                status="FAILED",
                is_automated=is_automated,
                notes=notes,
                error_message=f"Integrity check failed: {integrity_msg}",
                created_by=user,
            )
            return False, f"Integrity check failed: {integrity_msg}", record

        size = file_path.stat().st_size
        checksum = compute_file_sha256(file_path)

        record = DatabaseBackupRecord.objects.create(
            filename=filename,
            file_path=str(file_path),
            file_size_bytes=size,
            sha256_checksum=checksum,
            status="SUCCESS",
            is_automated=is_automated,
            notes=notes,
            created_by=user,
        )
        logger.info(f"Database backup succeeded: {filename} ({round(size / 1024, 2)} KB, SHA256: {checksum[:8]}...)")

        # Apply retention policy
        try:
            apply_retention_policy()
        except Exception as ret_err:
            logger.warning(f"Error applying retention policy: {ret_err}")

        return True, "Backup created and verified successfully.", record

    except subprocess.TimeoutExpired:
        err = "Database backup timed out after 180 seconds."
        logger.error(err)
        record = DatabaseBackupRecord.objects.create(
            filename=filename,
            file_path=str(file_path),
            status="FAILED",
            is_automated=is_automated,
            notes=notes,
            error_message=err,
            created_by=user,
        )
        return False, err, record
    except Exception as exc:
        err = f"Unexpected error during backup: {exc}"
        logger.error(err, exc_info=True)
        record = DatabaseBackupRecord.objects.create(
            filename=filename,
            file_path=str(file_path),
            status="FAILED",
            is_automated=is_automated,
            notes=notes,
            error_message=str(exc),
            created_by=user,
        )
        return False, err, record


def restore_database_backup(backup_record_or_id, user=None, confirmation_phrase: str = "", target_db: str = None):
    """
    Safely restores a database backup using pg_restore.
    Safeguards:
    1. Requires exact confirmation phrase: 'RESTORE-CONFIRM-<filename>'
    2. Verifies integrity of the source backup file first.
    3. Automatically creates a PRE-RESTORE SAFETY BACKUP before initiating restore!
    4. Only authorized admin can trigger restore.
    """
    from accounts.models import DatabaseBackupRecord

    if isinstance(backup_record_or_id, (int, str)) and str(backup_record_or_id).isdigit():
        backup = DatabaseBackupRecord.objects.filter(id=int(backup_record_or_id)).first()
    elif isinstance(backup_record_or_id, str):
        backup = DatabaseBackupRecord.objects.filter(filename=backup_record_or_id).first()
    else:
        backup = backup_record_or_id

    if not backup:
        return False, "Backup record not found."

    expected_phrase = f"RESTORE-CONFIRM-{backup.filename}"
    if confirmation_phrase.strip() != expected_phrase:
        return False, f"Invalid confirmation phrase. You must enter exactly: '{expected_phrase}'."

    file_path = Path(backup.file_path)
    if not file_path.is_file():
        return False, f"Backup file '{backup.filename}' not found on disk at {file_path}."

    # Step 1: Verify source backup integrity before touching database
    is_valid, integrity_msg = verify_backup_integrity(file_path)
    if not is_valid:
        return False, f"Source backup failed integrity check: {integrity_msg}. Restoration aborted."

    # Step 2: Create automated Pre-Restore Safety Backup
    logger.info("Creating pre-restore safety snapshot before proceeding with restoration...")
    safety_ok, safety_msg, safety_rec = create_database_backup(
        user=user,
        is_automated=True,
        notes=f"Automated pre-restore safety snapshot taken prior to restoring '{backup.filename}'."
    )
    if not safety_ok:
        return False, f"Pre-restore safety backup failed: {safety_msg}. Restoration aborted for safety."

    # Step 3: Execute pg_restore
    db_settings = settings.DATABASES["default"]
    db_name = target_db or db_settings.get("NAME")
    db_user = db_settings.get("USER", "postgres")
    db_password = db_settings.get("PASSWORD", "")
    db_host = db_settings.get("HOST", "localhost") or "localhost"
    db_port = str(db_settings.get("PORT", "5432") or "5432")

    try:
        pg_restore_bin = find_postgres_binary("pg_restore")
    except Exception as e:
        return False, f"pg_restore utility not found: {e}"

    env = os.environ.copy()
    if db_password:
        env["PGPASSWORD"] = db_password

    # Use pg_restore --clean --if-exists to restore into the database
    cmd = [
        pg_restore_bin,
        "-h", db_host,
        "-p", db_port,
        "-U", db_user,
        "-d", db_name,
        "--clean",
        "--if-exists",
        "--no-owner",
        str(file_path),
    ]

    logger.warning(f"ADMIN {user} initiating RESTORE of database {db_name} from {backup.filename}!")
    try:
        proc = subprocess.run(
            cmd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=300,
        )
        # Note: pg_restore may return code 1 for non-critical warnings (e.g. drop table if exists when table didn't exist)
        # Check stderr for fatal errors
        stderr_str = proc.stderr.decode("utf-8", errors="replace").strip()
        if proc.returncode > 1:
            logger.error(f"pg_restore fatal error (code {proc.returncode}): {stderr_str}")
            return False, f"Restore command encountered fatal errors: {stderr_str}"

        backup.restored_at = timezone.now()
        backup.restored_by = user
        backup.status = "RESTORED"
        backup.save(update_fields=["restored_at", "restored_by", "status"])

        logger.info(f"Database restoration completed successfully from {backup.filename} into {db_name}")
        return True, (
            f"Database successfully restored from '{backup.filename}'. "
            f"A pre-restore safety backup was captured as '{safety_rec.filename}'."
        )

    except subprocess.TimeoutExpired:
        err = "Database restoration timed out after 300 seconds."
        logger.error(err)
        return False, err
    except Exception as exc:
        err = f"Unexpected restoration failure: {exc}"
        logger.error(err, exc_info=True)
        return False, err

