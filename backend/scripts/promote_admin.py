from getpass import getpass

from sqlalchemy import text

from app.database.connection import SessionLocal
from app.models.user import User


def main() -> None:
    email = input("Email of the existing developer to promote: ").strip().lower()
    if not email:
        raise SystemExit("An email address is required.")

    confirmation = getpass("Type PROMOTE to continue: ")
    if confirmation != "PROMOTE":
        raise SystemExit("Admin promotion cancelled.")

    with SessionLocal.begin() as db:
        db.execute(text("LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE"))

        if db.query(User).filter(User.role == "admin").first() is not None:
            raise SystemExit(
                "An admin already exists; this one-time bootstrap command is disabled."
            )

        user = db.query(User).filter(User.email == email).with_for_update().first()
        if user is None:
            raise SystemExit("No user exists with that email address.")
        if user.role != "developer" or not user.is_active:
            raise SystemExit("Only an active developer account can be promoted.")

        user.role = "admin"

    print(f"Promoted {email} to admin.")


if __name__ == "__main__":
    main()
