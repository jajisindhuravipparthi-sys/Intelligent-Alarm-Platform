# pyright: reportMissingImports=false

try:
    from fastapi import FastAPI, Depends, HTTPException
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import psycopg2  # type: ignore[reportMissingModuleSource]
    from passlib.context import CryptContext
except ModuleNotFoundError as exc:
    raise RuntimeError(
        "Missing required backend dependencies. Install them with: "
        "pip install fastapi uvicorn psycopg2-binary passlib[bcrypt] "
        "python-jose[cryptography] pydantic"
    ) from exc

from jose import JWTError, jwt  # type: ignore[reportMissingModuleSource]

import random

import json

from typing import Optional

from datetime import datetime, date, time, timedelta, timezone
from zoneinfo import ZoneInfo
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from backend.database import get_connection

from backend.ml_model import predict_difficulty



# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI()
async def automatic_notification_checker():
    while True:
        connection = None
        cursor = None

        try:
            connection = get_connection()
            cursor = connection.cursor()

            cursor.execute(
                """
                SELECT
                    user_id,
                    sleep_time,
                    wake_up_time
                FROM user_profiles
                """
            )

            profiles = cursor.fetchall()

            now_utc = datetime.now(timezone.utc)

            for user_id, sleep_time, wake_up_time in profiles:

                user_time_zone = "Asia/Kolkata"

                try:
                    user_now = now_utc.astimezone(
                        ZoneInfo(user_time_zone)
                    )
                except Exception:
                    user_now = now_utc.astimezone(
                        ZoneInfo("Asia/Kolkata")
                    )

                current_time = user_now.strftime("%H:%M")
                current_date = user_now.date()

                print(
                    f"Notification checker | User: {user_id} | "
                    f"Current: {current_time} | "
                    f"Sleep: {sleep_time} | "
                    f"Wake: {wake_up_time}"
                )

                current_datetime = datetime.combine(
                    current_date,
                    user_now.time().replace(
                        second=0,
                        microsecond=0
                    )
                )

                # =========================
                # BEDTIME NOTIFICATION
                # =========================

                sleep_hhmm = str(sleep_time)[:5]

                sleep_time_obj = datetime.strptime(
                    sleep_hhmm,
                    "%H:%M"
                ).time()

                sleep_datetime = datetime.combine(
                    current_date,
                    sleep_time_obj
                )

                minutes_after_sleep = (
                    current_datetime - sleep_datetime
                ).total_seconds() / 60

                if 0 <= minutes_after_sleep <= 5:

                    cursor.execute(
                        """
                        SELECT notification_id
                        FROM notifications
                        WHERE user_id = %s
                          AND notification_type = 'bedtime'
                          AND DATE(created_at) = %s
                        LIMIT 1
                        """,
                        (user_id, current_date)
                    )

                    already_created = cursor.fetchone()

                    if not already_created:

                        cursor.execute(
                            """
                            INSERT INTO notifications
                            (
                                user_id,
                                notification_type,
                                title,
                                message
                            )
                            VALUES (%s, %s, %s, %s)
                            """,
                            (
                                user_id,
                                "bedtime",
                                "🌙 Bedtime Reminder",
                                "It's almost time to sleep. Get ready for a good night's rest."
                            )
                        )

                        connection.commit()

                        print(
                            f"✅ Bedtime notification created for user {user_id}"
                        )

                # =========================
                # WAKE-UP NOTIFICATION
                # =========================

                wake_hhmm = str(wake_up_time)[:5]

                wake_time_obj = datetime.strptime(
                    wake_hhmm,
                    "%H:%M"
                ).time()

                wake_datetime = datetime.combine(
                    current_date,
                    wake_time_obj
                )

                minutes_after_wake = (
                    current_datetime - wake_datetime
                ).total_seconds() / 60

                if 0 <= minutes_after_wake <= 5:

                    cursor.execute(
                        """
                        SELECT notification_id
                        FROM notifications
                        WHERE user_id = %s
                          AND notification_type = 'wake_up'
                          AND DATE(created_at) = %s
                        LIMIT 1
                        """,
                        (user_id, current_date)
                    )

                    already_created = cursor.fetchone()

                    if not already_created:

                        cursor.execute(
                            """
                            INSERT INTO notifications
                            (
                                user_id,
                                notification_type,
                                title,
                                message
                            )
                            VALUES (%s, %s, %s, %s)
                            """,
                            (
                                user_id,
                                "wake_up",
                                "⏰ Wake-up Reminder",
                                "Good morning! It's time to start your day."
                            )
                        )

                        connection.commit()

                        print(
                            f"✅ Wake-up notification created for user {user_id}"
                        )

                                        # =========================
                # HABIT ALERT
                # =========================

                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM behavioral_events
                    WHERE user_id = %s
                      AND event_type = 'snooze'
                      AND DATE(event_time) = %s
                    """,
                    (user_id, current_date)
                )

                snooze_count_today = cursor.fetchone()[0]

                if snooze_count_today >= 3:

                    cursor.execute(
                        """
                        SELECT notification_id
                        FROM notifications
                        WHERE user_id = %s
                          AND notification_type = 'habit_alert'
                          AND DATE(created_at) = %s
                        LIMIT 1
                        """,
                        (user_id, current_date)
                    )

                    already_created = cursor.fetchone()

                    if not already_created:

                        cursor.execute(
                            """
                            INSERT INTO notifications
                            (
                                user_id,
                                notification_type,
                                title,
                                message
                            )
                            VALUES (%s, %s, %s, %s)
                            """,
                            (
                                user_id,
                                "habit_alert",
                                "🎯 Habit Alert",
                                "You have snoozed your alarm several times today. Try to follow your wake-up routine consistently."
                            )
                        )

                        connection.commit()

                        print(
                            f"✅ Habit alert created for user {user_id}"
                        )

                                        # CHALLENGE REMINDER
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM behavioral_events
                    WHERE user_id = %s
                      AND event_type = 'challenge_completed'
                      AND DATE(event_time) = %s
                    """,
                    (user_id, current_date)
                )

                challenges_today = cursor.fetchone()[0]

                if challenges_today == 0 and current_time == "10:00":
                    cursor.execute(
                        """
                        SELECT notification_id
                        FROM notifications
                        WHERE user_id = %s
                          AND notification_type = 'challenge_reminder'
                          AND DATE(created_at) = %s
                        LIMIT 1
                        """,
                        (user_id, current_date)
                    )

                    already_created = cursor.fetchone()

                    if not already_created:
                        cursor.execute(
                            """
                            INSERT INTO notifications
                            (
                                user_id,
                                notification_type,
                                title,
                                message
                            )
                            VALUES (%s, %s, %s, %s)
                            """,
                            (
                                user_id,
                                "challenge_reminder",
                                "🧠 Challenge Reminder",
                                "You haven't completed a cognitive challenge today. Try one now to keep improving your mental performance."
                            )
                        )

                        connection.commit()

                        print(
                            f"🧠 Challenge reminder created for user {user_id}"
                        )
                                        # PROGRESS NOTIFICATION
                cursor.execute(
                    """
                    SELECT overall_score
                    FROM habit_scores
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    (user_id,)
                )

                habit_score_record = cursor.fetchone()

                if habit_score_record:
                    overall_score = float(habit_score_record[0])

                    if overall_score >= 70:
                        cursor.execute(
                            """
                            SELECT notification_id
                            FROM notifications
                            WHERE user_id = %s
                              AND notification_type = 'progress'
                              AND DATE(created_at) = %s
                            LIMIT 1
                            """,
                            (user_id, current_date)
                        )

                        already_created = cursor.fetchone()

                        if not already_created:
                            cursor.execute(
                                """
                                INSERT INTO notifications
                                (
                                    user_id,
                                    notification_type,
                                    title,
                                    message
                                )
                                VALUES (%s, %s, %s, %s)
                                """,
                                (
                                    user_id,
                                    "progress",
                                    "📈 Great Progress!",
                                    f"Your habit score is {overall_score:.0f}/100. Keep going and maintain your healthy routine."
                                )
                            )

                            connection.commit()

                            print(
                                f"📈 Progress notification created for user {user_id}"
                            )


        except Exception as e:
            print(
    f"✅ Wake-up notification created for user {user_id}"
)
            print(
                "Automatic notification error:",
                e
            )

        finally:
            if cursor:
                cursor.close()

            if connection:
                connection.close()

        await asyncio.sleep(60)
@app.on_event("startup")
async def start_notification_checker():
    asyncio.create_task(automatic_notification_checker())


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DATABASE CONNECTION
# =========================================================




# =========================================================
# PASSWORD SECURITY
# =========================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# =========================================================
# JWT SETTINGS
# =========================================================

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is missing from environment variables")

ALGORITHM = "HS256"

security = HTTPBearer()


# =========================================================
# TOKEN FUNCTIONS
# =========================================================

def verify_token(token: str):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload

    except JWTError:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    return verify_token(token)


def require_admin(
    current_user=Depends(get_current_user)
):

    if current_user.get("role") != "admin":

        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user
def require_wellness_coach(
    current_user=Depends(get_current_user)
):

    if current_user.get("role") not in ["wellness_coach", "admin"]:

        raise HTTPException(
            status_code=403,
            detail="Wellness Coach access required"
        )

    return current_user


def require_user(
    current_user=Depends(get_current_user)
):

    if current_user.get("role") not in [
        "user",
        "wellness_coach",
        "admin"
    ]:

        raise HTTPException(
            status_code=403,
            detail="Valid user role required"
        )

    return current_user


# =========================================================
# PYDANTIC MODELS
# =========================================================

class Alarm(BaseModel):

    user_id: int
    alarm_time: str
    alarm_name: str
    alarm_type: str = "Daily Alarm"
    recurrence_days: str = "Mon,Tue,Wed,Thu,Fri,Sat,Sun"
    alarm_date: str | None = None
    time_zone: str = "Asia/Kolkata"
    smart_window_minutes: int = 30
    snooze_limit: int = 3


class Challenge(BaseModel):

    challenge_type: str

    difficulty: str

    question: str

    correct_answer: str


class Answer(BaseModel):

    challenge_id: int

    user_answer: str

class WakeUpVerification(BaseModel):
    alarm_id: int
    challenge_id: int
    user_answer: str


class RegisterUser(BaseModel):

    name: str

    email: str

    password: str


class LoginUser(BaseModel):

    email: str

    password: str


class UserProfile(BaseModel):

    wake_up_time: str
    sleep_time: str
    preferred_challenge_type: str
    preferred_difficulty: str
    sleep_duration_minutes: int = 480
    time_zone: str = "Asia/Kolkata"
    productivity_goals: str = ""
    habit_preferences: str = ""


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def home():

    return {
        "message": "Intelligent Cognitive Alarm Platform API is running"
    }


# =========================================================
# REGISTER
# =========================================================

@app.post("/register")
def register_user(user: RegisterUser):

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor()

        # Check whether email already exists

        cursor.execute(
            """
            SELECT user_id
            FROM users
            WHERE email = %s
            """,
            (user.email,)
        )

        existing_user = cursor.fetchone()

        if existing_user:

            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

        # Hash password

        hashed_password = pwd_context.hash(
            user.password
        )

        # Insert user

        cursor.execute(
            """
            INSERT INTO users
            (name, email, password, role)
            VALUES (%s, %s, %s, %s)
            RETURNING user_id
            """,
            (
                user.name,
                user.email,
                hashed_password,
                "user"
            )
        )

        user_id = cursor.fetchone()[0]

        connection.commit()

        return {
            "message": "User registered successfully",
            "user_id": user_id
        }

    except HTTPException:

        raise

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# LOGIN
# =========================================================

@app.post("/login")
def login_user(user: LoginUser):

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                user_id,
                name,
                password,
                role
            FROM users
            WHERE email = %s
            """,
            (user.email,)
        )

        db_user = cursor.fetchone()

        if not db_user:

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        user_id = db_user[0]
        name = db_user[1]
        hashed_password = db_user[2]
        role = db_user[3]

        # Verify password

        if not pwd_context.verify(
            user.password,
            hashed_password
        ):

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # JWT payload

        payload = {
            "user_id": user_id,
            "name": name,
            "role": role
        }

        token = jwt.encode(
            payload,
            SECRET_KEY,
            algorithm=ALGORITHM
        )

        return {
            "access_token": token,
            "token_type": "bearer"
        }

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# GET ALL USERS - ADMIN ONLY
# =========================================================

@app.get("/users")
def get_users(
    current_user=Depends(require_admin)
):

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                user_id,
                name,
                email,
                role
            FROM users
            ORDER BY user_id
            """
        )

        users = cursor.fetchall()

        return users

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# CREATE ALARM
# =========================================================

@app.post("/alarms")
def create_alarm(
    alarm: Alarm,
    current_user=Depends(get_current_user)
):

    connection = None
    cursor = None

    try:

        current_user_id = current_user.get("user_id")

        # Security check:
        # User can create alarms only for themselves

        if current_user_id != alarm.user_id:

            raise HTTPException(
                status_code=403,
                detail="You can only create alarms for your own account"
            )

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO alarms
            (
                user_id, alarm_time, alarm_name, alarm_type, recurrence_days,
                alarm_date, time_zone, smart_window_minutes, snooze_limit, snooze_count
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,0)
            RETURNING alarm_id, user_id, alarm_time, alarm_name, is_active,
                      alarm_type, recurrence_days, alarm_date, time_zone,
                      smart_window_minutes, snooze_limit, snooze_count
            """,
            (
                alarm.user_id, alarm.alarm_time, alarm.alarm_name,
                alarm.alarm_type, alarm.recurrence_days, alarm.alarm_date,
                alarm.time_zone, alarm.smart_window_minutes, alarm.snooze_limit
            )
        )

        new_alarm = cursor.fetchone()

        connection.commit()

        return new_alarm

    except HTTPException:

        raise

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# GET CURRENT USER ALARMS
# =========================================================

@app.get("/alarms")
def get_alarms(
    current_user=Depends(get_current_user)
):

    connection = None
    cursor = None

    try:

        user_id = current_user.get("user_id")

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                alarm_id,
                user_id,
                alarm_time,
                alarm_name, is_active, alarm_type, recurrence_days, alarm_date,
                time_zone, smart_window_minutes, snooze_limit, snooze_count
            FROM alarms
            WHERE user_id = %s
            ORDER BY alarm_time
            """,
            (user_id,)
        )

        alarms = cursor.fetchall()

        return alarms

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()

@app.put("/alarms/{alarm_id}")
def update_alarm(
    alarm_id: int,
    alarm: Alarm,
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        # Check whether the alarm exists
        cursor.execute(
            """
            SELECT user_id
            FROM alarms
            WHERE alarm_id = %s
            """,
            (alarm_id,)
        )

        existing_alarm = cursor.fetchone()

        if not existing_alarm:
            raise HTTPException(
                status_code=404,
                detail="Alarm not found"
            )

        # Make sure the alarm belongs to the logged-in user
        if existing_alarm[0] != user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own alarms"
            )

        # Update the alarm
        cursor.execute(
            """
            UPDATE alarms
            SET alarm_time = %s, alarm_name = %s, alarm_type = %s,
                recurrence_days = %s, alarm_date = %s, time_zone = %s,
                smart_window_minutes = %s, snooze_limit = %s
            WHERE alarm_id = %s
            """,
            (
                alarm.alarm_time, alarm.alarm_name, alarm.alarm_type,
                alarm.recurrence_days, alarm.alarm_date, alarm.time_zone,
                alarm.smart_window_minutes, alarm.snooze_limit, alarm_id
            )
        )

        connection.commit()

        return {
            "message": "Alarm updated successfully"
        }

    except HTTPException:
        raise

    except Exception as e:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()

# =========================================================
# DELETE ALARM
# =========================================================

@app.delete("/alarms/{alarm_id}")
def delete_alarm(
    alarm_id: int,
    current_user=Depends(get_current_user)
):

    connection = None
    cursor = None

    try:

        user_id = current_user.get("user_id")

        connection = get_connection()

        cursor = connection.cursor()

        # -------------------------------------------------
        # Check whether the alarm exists
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT user_id
            FROM alarms
            WHERE alarm_id = %s
            """,
            (alarm_id,)
        )

        alarm = cursor.fetchone()

        if not alarm:

            raise HTTPException(
                status_code=404,
                detail="Alarm not found"
            )

        # -------------------------------------------------
        # Security check
        # User can delete only their own alarm
        # -------------------------------------------------

        if alarm[0] != user_id:

            raise HTTPException(
                status_code=403,
                detail="You can only delete your own alarms"
            )

        # -------------------------------------------------
        # Delete challenge links first
        # -------------------------------------------------

        cursor.execute(
            """
            DELETE FROM alarm_challenges
            WHERE alarm_id = %s
            """,
            (alarm_id,)
        )

        # -------------------------------------------------
        # Delete alarm
        # -------------------------------------------------

        cursor.execute(
            """
            DELETE FROM alarms
            WHERE alarm_id = %s
            """,
            (alarm_id,)
        )

        connection.commit()

        return {
            "message": "Alarm deleted successfully"
        }

    except HTTPException:

        raise

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# CREATE CHALLENGE
# =========================================================

@app.post("/challenges")
def create_challenge(
    challenge: Challenge
):

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO challenges
            (
                challenge_type,
                difficulty,
                question,
                correct_answer
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s
            )
            RETURNING challenge_id
            """,
            (
                challenge.challenge_type,
                challenge.difficulty,
                challenge.question,
                challenge.correct_answer
            )
        )

        challenge_id = cursor.fetchone()[0]

        connection.commit()

        return {
            "message": "Challenge created successfully",
            "challenge_id": challenge_id
        }

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# GET ALL CHALLENGES
# =========================================================

@app.get("/challenges")
def get_challenges():

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                challenge_id,
                challenge_type,
                difficulty,
                question,
                correct_answer
            FROM challenges
            ORDER BY challenge_id
            """
        )

        challenges = cursor.fetchall()

        return challenges

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# GET ONE CHALLENGE
# =========================================================

@app.get("/challenges/{challenge_id}")
def get_challenge(
    challenge_id: int
):

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                challenge_id,
                challenge_type,
                difficulty,
                question,
                correct_answer
            FROM challenges
            WHERE challenge_id = %s
            """,
            (challenge_id,)
        )

        challenge = cursor.fetchone()

        if not challenge:

            raise HTTPException(
                status_code=404,
                detail="Challenge not found"
            )

        return challenge

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# LINK CHALLENGE TO ALARM
# =========================================================

@app.post("/alarm-challenges")
def link_challenge_to_alarm(
    alarm_id: int,
    challenge_id: int
):

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO alarm_challenges
            (
                alarm_id,
                challenge_id
            )
            VALUES
            (
                %s,
                %s
            )
            RETURNING alarm_challenge_id
            """,
            (
                alarm_id,
                challenge_id
            )
        )

        relationship_id = cursor.fetchone()[0]

        connection.commit()

        return {
            "message": "Challenge linked to alarm successfully",
            "alarm_challenge_id": relationship_id
        }

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# GET ALARM CHALLENGES
# =========================================================

@app.get("/alarm-challenges")
def get_alarm_challenges():

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                alarm_challenge_id,
                alarm_id,
                challenge_id
            FROM alarm_challenges
            ORDER BY alarm_challenge_id
            """
        )

        relationships = cursor.fetchall()

        return relationships

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# GET CHALLENGE FOR ALARM
# =========================================================

@app.get("/alarms/{alarm_id}/challenge")
def get_alarm_challenge(
    alarm_id: int
):

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                c.challenge_id,
                c.challenge_type,
                c.difficulty,
                c.question,
                c.correct_answer
            FROM challenges c
            JOIN alarm_challenges ac
                ON c.challenge_id = ac.challenge_id
            WHERE ac.alarm_id = %s
            ORDER BY ac.alarm_challenge_id
            LIMIT 1
            """,
            (alarm_id,)
        )

        challenge = cursor.fetchone()

        if not challenge:

            raise HTTPException(
                status_code=404,
                detail="No challenge linked to this alarm"
            )

        return challenge

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# SUBMIT ANSWER
# =========================================================

@app.post("/submit-answer")
def submit_answer(
    answer: Answer,
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        # Get the correct answer
        cursor.execute(
            """
            SELECT correct_answer
            FROM challenges
            WHERE challenge_id = %s
            """,
            (answer.challenge_id,)
        )

        challenge = cursor.fetchone()

        if not challenge:
            raise HTTPException(
                status_code=404,
                detail="Challenge not found"
            )

        correct_answer = challenge[0]

        # Check the user's answer
        is_correct = (
            answer.user_answer.strip().lower()
            ==
            correct_answer.strip().lower()
        )

        # Save the challenge attempt
        cursor.execute(
            """
            INSERT INTO challenge_attempts
            (
                user_id,
                challenge_id,
                user_answer,
                is_correct
            )
            VALUES (%s, %s, %s, %s)
            """,
            (
                user_id,
                answer.challenge_id,
                answer.user_answer,
                is_correct
            )
        )

        connection.commit()

        return {
            "challenge_id": answer.challenge_id,
            "correct": is_correct,
            "message":
                "Correct answer!"
                if is_correct
                else "Incorrect answer"
        }

    except HTTPException:
        raise

    except Exception as e:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()

@app.get("/challenge-analytics")
def get_challenge_analytics(
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_attempts,
                COALESCE(SUM(CASE WHEN is_correct = TRUE THEN 1 ELSE 0 END), 0)
                    AS correct_answers,
                COALESCE(SUM(CASE WHEN is_correct = FALSE THEN 1 ELSE 0 END), 0)
                    AS wrong_answers
            FROM challenge_attempts
            WHERE user_id = %s
            """,
            (user_id,)
        )

        result = cursor.fetchone()

        total_attempts = result[0]
        correct_answers = result[1]
        wrong_answers = result[2]

        if total_attempts > 0:
            accuracy = round(
                (correct_answers / total_attempts) * 100,
                2
            )
        else:
            accuracy = 0

        return {
            "user_id": user_id,
            "total_attempts": total_attempts,
            "correct_answers": correct_answers,
            "wrong_answers": wrong_answers,
            "accuracy_percentage": accuracy
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()



@app.get("/admin/analytics")
def get_admin_analytics(
    current_user=Depends(get_current_user)
):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    connection = None

    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        # Total users
        cursor.execute("""
            SELECT COUNT(*)
            FROM users
        """)
        total_users = cursor.fetchone()[0]

        # Admin users
        cursor.execute("""
            SELECT COUNT(*)
            FROM users
            WHERE role = 'admin'
        """)
        total_admins = cursor.fetchone()[0]

        # Wellness coaches
        cursor.execute("""
            SELECT COUNT(*)
            FROM users
            WHERE role = 'wellness_coach'
        """)
        total_coaches = cursor.fetchone()[0]

        # Normal users
        cursor.execute("""
            SELECT COUNT(*)
            FROM users
            WHERE role = 'user'
        """)
        total_normal_users = cursor.fetchone()[0]

        # Total challenge attempts
        cursor.execute("""
            SELECT COUNT(*)
            FROM challenge_attempts
        """)
        total_attempts = cursor.fetchone()[0]

        # Correct answers
        cursor.execute("""
            SELECT COUNT(*)
            FROM challenge_attempts
            WHERE is_correct = TRUE
        """)
        correct_answers = cursor.fetchone()[0]

        # Challenge accuracy
        if total_attempts > 0:
            challenge_accuracy = round(
                (correct_answers / total_attempts) * 100,
                2
            )
        else:
            challenge_accuracy = 0

        # Behavioral events
        cursor.execute("""
            SELECT COUNT(*)
            FROM behavioral_events
        """)
        behavioral_events = cursor.fetchone()[0]

        return {
            "total_users": total_users,
            "total_admins": total_admins,
            "total_coaches": total_coaches,
            "total_normal_users": total_normal_users,
            "total_challenge_attempts": total_attempts,
            "correct_answers": correct_answers,
            "challenge_accuracy": challenge_accuracy,
            "behavioral_events": behavioral_events
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()
@app.get("/challenge-analytics/by-type")
def get_challenge_analytics_by_type(
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                c.challenge_type,
                COUNT(ca.attempt_id) AS total_attempts,
                COALESCE(
                    SUM(
                        CASE
                            WHEN ca.is_correct = TRUE THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS correct_answers,
                COALESCE(
                    SUM(
                        CASE
                            WHEN ca.is_correct = FALSE THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS wrong_answers
            FROM challenge_attempts ca
            JOIN challenges c
                ON ca.challenge_id = c.challenge_id
            WHERE ca.user_id = %s
            GROUP BY c.challenge_type
            ORDER BY c.challenge_type
            """,
            (user_id,)
        )

        results = cursor.fetchall()

        analytics = []

        for row in results:
            challenge_type = row[0]
            total_attempts = row[1]
            correct_answers = row[2]
            wrong_answers = row[3]

            if total_attempts > 0:
                accuracy = round(
                    (correct_answers / total_attempts) * 100,
                    2
                )
            else:
                accuracy = 0

            analytics.append(
                {
                    "challenge_type": challenge_type,
                    "total_attempts": total_attempts,
                    "correct_answers": correct_answers,
                    "wrong_answers": wrong_answers,
                    "accuracy_percentage": accuracy
                }
            )

        return {
            "user_id": user_id,
            "analytics": analytics
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()

# Admin-wide challenge performance report
@app.get("/admin/reports/challenge-performance")
def get_admin_challenge_performance(
    current_user=Depends(get_current_user)
):
    # Only admins can access this report
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                c.challenge_type,
                COUNT(ca.attempt_id) AS total_attempts,
                COALESCE(
                    SUM(
                        CASE
                            WHEN ca.is_correct = TRUE THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS correct_answers,
                COALESCE(
                    SUM(
                        CASE
                            WHEN ca.is_correct = FALSE THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS wrong_answers
            FROM challenge_attempts ca
            JOIN challenges c
                ON ca.challenge_id = c.challenge_id
            GROUP BY c.challenge_type
            ORDER BY c.challenge_type
            """
        )

        results = cursor.fetchall()
        analytics = []

        for row in results:
            challenge_type = row[0]
            total_attempts = row[1]
            correct_answers = row[2]
            wrong_answers = row[3]

            accuracy = (
                round(correct_answers / total_attempts * 100, 2)
                if total_attempts > 0
                else 0
            )

            analytics.append({
                "challenge_type": challenge_type,
                "total_attempts": total_attempts,
                "correct_answers": correct_answers,
                "wrong_answers": wrong_answers,
                "accuracy_percentage": accuracy
            })

        return {
            "total_challenge_types": len(analytics),
            "analytics": analytics
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()
# =========================================================
# GET USER PROFILE
# =========================================================

@app.get("/users/{user_id}/profile")
def get_user_profile(
    user_id: int,
    current_user=Depends(get_current_user)
):

    # Ownership check

    if current_user.get("user_id") != user_id:

        raise HTTPException(
            status_code=403,
            detail="You can only access your own profile"
        )

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                profile_id,
                user_id,
                wake_up_time,
                sleep_time,
                preferred_challenge_type, preferred_difficulty, sleep_duration_minutes,
                time_zone, productivity_goals, habit_preferences
            FROM user_profiles
            WHERE user_id = %s
            """,
            (user_id,)
        )

        profile = cursor.fetchone()

        if not profile:

            raise HTTPException(
                status_code=404,
                detail="Profile not found"
            )

        return {
            "profile_id": profile[0],
            "user_id": profile[1],
            "wake_up_time": str(profile[2]),
            "sleep_time": str(profile[3]),
            "preferred_challenge_type": profile[4],
            "preferred_difficulty": profile[5],
            "sleep_duration_minutes": profile[6],
            "time_zone": profile[7],
            "productivity_goals": profile[8] or "",
            "habit_preferences": profile[9] or ""
        }

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# CREATE OR UPDATE USER PROFILE
# =========================================================

@app.post("/users/{user_id}/profile")
def save_user_profile(
    user_id: int,
    profile: UserProfile,
    current_user=Depends(get_current_user)
):
    if current_user.get("user_id") != user_id:
        raise HTTPException(
            status_code=403,
            detail="You can only modify your own profile"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT profile_id
            FROM user_profiles
            WHERE user_id = %s
            """,
            (user_id,)
        )
        existing_profile = cursor.fetchone()

        if existing_profile:
            cursor.execute(
                """
                UPDATE user_profiles
                SET
                    wake_up_time = %s,
                    sleep_time = %s,
                    preferred_challenge_type = %s,
                    preferred_difficulty = %s,
                    sleep_duration_minutes = %s,
                    time_zone = %s,
                    productivity_goals = %s,
                    habit_preferences = %s
                WHERE user_id = %s
                RETURNING
                    profile_id,
                    user_id,
                    wake_up_time,
                    sleep_time,
                    preferred_challenge_type,
                    preferred_difficulty,
                    sleep_duration_minutes,
                    time_zone,
                    productivity_goals,
                    habit_preferences
                """,
                (
                    profile.wake_up_time,
                    profile.sleep_time,
                    profile.preferred_challenge_type,
                    profile.preferred_difficulty,
                    profile.sleep_duration_minutes,
                    profile.time_zone,
                    profile.productivity_goals,
                    profile.habit_preferences,
                    user_id
                )
            )
            saved_profile = cursor.fetchone()
            connection.commit()

            return {
                "message": "Profile updated successfully",
                "profile": {
                    "profile_id": saved_profile[0],
                    "user_id": saved_profile[1],
                    "wake_up_time": str(saved_profile[2]),
                    "sleep_time": str(saved_profile[3]),
                    "preferred_challenge_type": saved_profile[4],
                    "preferred_difficulty": saved_profile[5],
                    "sleep_duration_minutes": saved_profile[6],
                    "time_zone": saved_profile[7],
                    "productivity_goals": saved_profile[8] or "",
                    "habit_preferences": saved_profile[9] or ""
                }
            }

        cursor.execute(
            """
            INSERT INTO user_profiles
            (
                user_id,
                wake_up_time,
                sleep_time,
                preferred_challenge_type,
                preferred_difficulty,
                sleep_duration_minutes,
                time_zone,
                productivity_goals,
                habit_preferences
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING
                profile_id,
                user_id,
                wake_up_time,
                sleep_time,
                preferred_challenge_type,
                preferred_difficulty,
                sleep_duration_minutes,
                time_zone,
                productivity_goals,
                habit_preferences
            """,
            (
                user_id,
                profile.wake_up_time,
                profile.sleep_time,
                profile.preferred_challenge_type,
                profile.preferred_difficulty,
                profile.sleep_duration_minutes,
                profile.time_zone,
                profile.productivity_goals,
                profile.habit_preferences
            )
        )
        saved_profile = cursor.fetchone()
        connection.commit()

        return {
            "message": "Profile created successfully",
            "profile": {
                "profile_id": saved_profile[0],
                "user_id": saved_profile[1],
                "wake_up_time": str(saved_profile[2]),
                "sleep_time": str(saved_profile[3]),
                "preferred_challenge_type": saved_profile[4],
                "preferred_difficulty": saved_profile[5],
                "sleep_duration_minutes": saved_profile[6],
                "time_zone": saved_profile[7],
                "productivity_goals": saved_profile[8] or "",
                "habit_preferences": saved_profile[9] or ""
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        if connection:
            connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# =========================================================
# MILESTONE 1 - COMPLETE PROFILE & ALARM SCHEDULING
# =========================================================

VALID_ALARM_TYPES = [
    "Daily Alarm", "Weekday Alarm", "Weekend Alarm",
    "One-Time Alarm", "Smart Adaptive Alarm"
]

DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def normalized_recurrence(alarm_type, recurrence_days):
    if alarm_type == "Daily Alarm":
        return ",".join(DAY_NAMES)
    if alarm_type == "Weekday Alarm":
        return "Mon,Tue,Wed,Thu,Fri"
    if alarm_type == "Weekend Alarm":
        return "Sat,Sun"
    if alarm_type == "One-Time Alarm":
        return ""
    # Smart Adaptive Alarm can be used on selected days.
    return recurrence_days or ",".join(DAY_NAMES)


def validate_alarm_payload(alarm):
    if alarm.alarm_type not in VALID_ALARM_TYPES:
        raise HTTPException(status_code=400, detail="Invalid alarm type")
    if alarm.snooze_limit < 0 or alarm.snooze_limit > 20:
        raise HTTPException(status_code=400, detail="Snooze limit must be between 0 and 20")
    if alarm.smart_window_minutes < 0 or alarm.smart_window_minutes > 180:
        raise HTTPException(status_code=400, detail="Smart window must be between 0 and 180 minutes")
    try:
        datetime.strptime(alarm.alarm_time, "%H:%M")
    except ValueError:
        raise HTTPException(status_code=400, detail="alarm_time must use HH:MM format")
    if alarm.alarm_type == "One-Time Alarm":
        if not alarm.alarm_date:
            raise HTTPException(status_code=400, detail="alarm_date is required for One-Time Alarm")
        try:
            date.fromisoformat(alarm.alarm_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="alarm_date must use YYYY-MM-DD format")


# Replace the alarm creation behavior with normalized scheduling data.

@app.get("/alarms/upcoming")
def get_upcoming_alarms(current_user=Depends(get_current_user)):

    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("""
            SELECT
                alarm_id,
                alarm_time,
                alarm_name,
                alarm_type,
                recurrence_days,
                alarm_date,
                time_zone,
                smart_window_minutes,
                snooze_limit,
                snooze_count,
                is_active
            FROM alarms
            WHERE user_id = %s
              AND is_active = TRUE
            ORDER BY alarm_time
        """, (user_id,))

        rows = cursor.fetchall()

        now = datetime.now()
        upcoming = []

        for row in rows:

            alarm_id = row[0]
            alarm_time = row[1]
            name = row[2]
            alarm_type = row[3]
            recurrence_days = row[4]
            alarm_date = row[5]
            tz = row[6]
            window = row[7]
            snooze_limit = row[8]
            snooze_count = row[9]
            active = row[10]

            hhmm = str(alarm_time)[:5]
            base_time = datetime.strptime(
                hhmm,
                "%H:%M"
            ).time()

            next_dt = None

            if alarm_type == "One-Time Alarm" and alarm_date:

                candidate = datetime.combine(
                    alarm_date,
                    base_time
                )

                if candidate >= now:
                    next_dt = candidate
            else:

                selected = set(
                    (recurrence_days or "").split(",")
                )

                for offset in range(8):

                    candidate_date = (
                        now + timedelta(days=offset)
                    ).date()

                    day = DAY_NAMES[
                        candidate_date.weekday()
                    ]

                    candidate = datetime.combine(
                        candidate_date,
                        base_time
                    )

                    if (
                        day in selected
                        and candidate >= now
                    ):
                        next_dt = candidate
                        break

            if next_dt:

                upcoming.append({
                    "alarm_id": alarm_id,
                    "alarm_name": name,
                    "alarm_type": alarm_type,
                    "next_trigger": next_dt.isoformat(
                        timespec="minutes"
                    ),
                    "time_zone": tz,
                    "smart_window_minutes": window,
                    "snooze_limit": snooze_limit,
                    "snooze_count": snooze_count,
                    "is_active": active
                })

        upcoming.sort(
            key=lambda x: x["next_trigger"]
        )

        return upcoming

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()
@app.post("/alarms/{alarm_id}/snooze")
def snooze_alarm(alarm_id: int, current_user=Depends(get_current_user)):
    connection = None
    cursor = None
    try:
        user_id = current_user.get("user_id")
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("""
            SELECT snooze_count, snooze_limit, user_id
            FROM alarms WHERE alarm_id = %s
        """, (alarm_id,))
        row = cursor.fetchone()
        if not row: raise HTTPException(status_code=404, detail="Alarm not found")
        count, limit, owner = row
        if owner != user_id: raise HTTPException(status_code=403, detail="You can only snooze your own alarms")
        if count >= limit:
            return {"snoozed": False, "message": "Snooze limit reached", "snooze_count": count, "snooze_limit": limit}
        count += 1
        cursor.execute("UPDATE alarms SET snooze_count = %s WHERE alarm_id = %s", (count, alarm_id))
        connection.commit()
        return {"snoozed": True, "message": "Alarm snoozed", "snooze_count": count, "snooze_limit": limit}
    except HTTPException: raise
    except Exception as e:
        if connection: connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor: cursor.close()
        if connection: connection.close()


@app.post("/alarms/{alarm_id}/trigger")
def trigger_alarm(alarm_id: int, current_user=Depends(get_current_user)):
    connection = None
    cursor = None
    try:
        user_id = current_user.get("user_id")
        connection = get_connection(); cursor = connection.cursor()
        cursor.execute("""
            SELECT user_id, alarm_type, alarm_date, is_active
            FROM alarms WHERE alarm_id = %s
        """, (alarm_id,))
        row = cursor.fetchone()
        if not row: raise HTTPException(status_code=404, detail="Alarm not found")
        if row[0] != user_id: raise HTTPException(status_code=403, detail="You can only trigger your own alarm")
        if not row[3]: raise HTTPException(status_code=400, detail="Alarm is inactive")
        cursor.execute("UPDATE alarms SET snooze_count = 0 WHERE alarm_id = %s", (alarm_id,))
        connection.commit()
        return {"alarm_id": alarm_id, "triggered": True, "message": "Alarm triggered; cognitive challenge required"}
    except HTTPException: raise
    except Exception as e:
        if connection: connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor: cursor.close()
        if connection: connection.close()


@app.post("/alarms/{alarm_id}/complete")
def complete_alarm(alarm_id: int, current_user=Depends(get_current_user)):
    connection = None
    cursor = None
    try:
        user_id = current_user.get("user_id")
        connection = get_connection(); cursor = connection.cursor()
        cursor.execute("SELECT user_id, alarm_type FROM alarms WHERE alarm_id = %s", (alarm_id,))
        row = cursor.fetchone()
        if not row: raise HTTPException(status_code=404, detail="Alarm not found")
        if row[0] != user_id: raise HTTPException(status_code=403, detail="You can only complete your own alarm")
        if row[1] == "One-Time Alarm":
            cursor.execute("UPDATE alarms SET is_active = FALSE, snooze_count = 0 WHERE alarm_id = %s", (alarm_id,))
        else:
            cursor.execute("UPDATE alarms SET snooze_count = 0 WHERE alarm_id = %s", (alarm_id,))
        connection.commit()
        return {"alarm_id": alarm_id, "completed": True, "message": "Alarm completed successfully"}
    except HTTPException: raise
    except Exception as e:
        if connection: connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor: cursor.close()
        if connection: connection.close()


# =========================================================
# MILESTONE 2 - COGNITIVE CHALLENGE GENERATOR
# =========================================================

# ---------------------------------------------------------
# Generate Math Challenge
# ---------------------------------------------------------

def generate_math_challenge(difficulty):

    if difficulty == "Beginner":

        num1 = random.randint(1, 10)
        num2 = random.randint(1, 10)

        question = f"What is {num1} + {num2}?"
        answer = str(num1 + num2)

    elif difficulty == "Easy":

        num1 = random.randint(10, 30)
        num2 = random.randint(5, 20)

        question = f"What is {num1} + {num2}?"
        answer = str(num1 + num2)

    elif difficulty == "Medium":

        num1 = random.randint(10, 50)
        num2 = random.randint(5, 30)

        question = f"What is {num1} × {num2}?"
        answer = str(num1 * num2)

    elif difficulty == "Hard":

        num1 = random.randint(20, 100)
        num2 = random.randint(5, 30)

        question = f"What is {num1} × {num2}?"
        answer = str(num1 * num2)

    else:

        num1 = random.randint(50, 200)
        num2 = random.randint(10, 50)
        num3 = random.randint(2, 10)

        answer_value = (num1 + num2) * num3

        question = f"What is ({num1} + {num2}) × {num3}?"
        answer = str(answer_value)

    return question, answer


# ---------------------------------------------------------
# Generate Logic Challenge
# ---------------------------------------------------------

def generate_logic_challenge(difficulty):

    logic_questions = {

        "Beginner": [
            (
                "If all cats are animals and Tom is a cat, is Tom an animal?",
                "yes"
            ),
            (
                "If today is Monday, what day comes after Monday?",
                "Tuesday"
            ),
        ],

        "Easy": [
            (
                "A train leaves at 10 AM and arrives at 12 PM. How many hours did the journey take?",
                "2"
            ),
            (
                "If 5 people each have 2 apples, how many apples are there in total?",
                "10"
            ),
        ],

        "Medium": [
            (
                "If 3 workers complete a task in 6 days, how many worker-days are required?",
                "18"
            ),
            (
                "A clock shows 3:00. What is the angle between the hour and minute hands?",
                "90"
            ),
        ],

        "Hard": [
            (
                "If a sequence follows 2, 6, 12, 20, 30, what is the next number?",
                "42"
            ),
            (
                "If 4 machines make 4 products in 4 minutes, how many minutes would 8 machines take to make 8 products?",
                "4"
            ),
        ],

        "Expert": [
            (
                "A number is multiplied by 3 and then 6 is added. The result is 30. What is the number?",
                "8"
            ),
            (
                "If 5 consecutive integers have a sum of 75, what is the middle integer?",
                "15"
            ),
        ],
    }

    questions = logic_questions.get(
        difficulty,
        logic_questions["Beginner"]
    )

    return random.choice(questions)


# ---------------------------------------------------------
# Generate Memory Challenge
# ---------------------------------------------------------

def generate_memory_challenge(difficulty):

    if difficulty == "Beginner":

        numbers = [
            random.randint(1, 9)
            for _ in range(3)
        ]

    elif difficulty == "Easy":

        numbers = [
            random.randint(1, 9)
            for _ in range(4)
        ]

    elif difficulty == "Medium":

        numbers = [
            random.randint(1, 9)
            for _ in range(5)
        ]

    elif difficulty == "Hard":

        numbers = [
            random.randint(1, 9)
            for _ in range(6)
        ]

    else:

        numbers = [
            random.randint(1, 9)
            for _ in range(8)
        ]

    sequence = " ".join(map(str, numbers))

    question = (
        f"Remember this sequence: {sequence}. "
        f"What was the sequence?"
    )

    answer = sequence

    return question, answer


# ---------------------------------------------------------
# Generate Word Challenge
# ---------------------------------------------------------

def generate_word_challenge(difficulty):

    word_questions = {

        "Beginner": [
            (
                "What is the opposite of hot?",
                "cold"
            ),
            (
                "What is the opposite of big?",
                "small"
            ),
        ],

        "Easy": [
            (
                "What is the opposite of happy?",
                "sad"
            ),
            (
                "What is the opposite of fast?",
                "slow"
            ),
        ],

        "Medium": [
            (
                "Unscramble this word: NOHPE",
                "phone"
            ),
            (
                "Unscramble this word: RETAW",
                "water"
            ),
        ],

        "Hard": [
            (
                "Unscramble this word: RETUPMOC",
                "computer"
            ),
            (
                "Unscramble this word: NOITACUDE",
                "education"
            ),
        ],

        "Expert": [
            (
                "Unscramble this word: NOITAZILIBAT",
                "stabilization"
            ),
            (
                "Unscramble this word: NOITACINUMMOC",
                "communication"
            ),
        ],
    }

    questions = word_questions.get(
        difficulty,
        word_questions["Beginner"]
    )

    return random.choice(questions)


# ---------------------------------------------------------
# Generate Pattern Challenge
# ---------------------------------------------------------

def generate_pattern_challenge(difficulty):

    if difficulty == "Beginner":

        start = random.randint(1, 10)

        sequence = [
            start,
            start + 2,
            start + 4,
            start + 6
        ]

        answer = str(start + 8)

    elif difficulty == "Easy":

        start = random.randint(2, 10)

        sequence = [
            start,
            start + 3,
            start + 6,
            start + 9
        ]

        answer = str(start + 12)

    elif difficulty == "Medium":

        start = random.randint(1, 5)

        sequence = [
            start,
            start * 2,
            start * 4,
            start * 8
        ]

        answer = str(start * 16)

    elif difficulty == "Hard":

        start = random.randint(1, 5)

        sequence = [
            start,
            start + 3,
            start + 8,
            start + 15
        ]

        answer = str(start + 24)

    else:

        start = random.randint(1, 5)

        sequence = [
            start,
            start + 4,
            start + 10,
            start + 18,
            start + 28
        ]

        answer = str(start + 40)

    question = (
        "Find the next number in the sequence: "
        + ", ".join(map(str, sequence))
        + ", ?"
    )

    return question, answer


# ---------------------------------------------------------
# Generate Riddle Challenge
# ---------------------------------------------------------

def generate_riddle_challenge(difficulty):

    riddles = {

        "Beginner": [
            (
                "I have hands but cannot clap. What am I?",
                "clock"
            ),
            (
                "I have four legs but cannot walk. What am I?",
                "table"
            ),
        ],

        "Easy": [
            (
                "I am full of keys but cannot open a door. What am I?",
                "keyboard"
            ),
            (
                "I have a face and two hands but no arms or legs. What am I?",
                "clock"
            ),
        ],

        "Medium": [
            (
                "The more you take, the more you leave behind. What are they?",
                "footsteps"
            ),
            (
                "I can be cracked, made, told, and played. What am I?",
                "joke"
            ),
        ],

        "Hard": [
            (
                "I speak without a mouth and hear without ears. What am I?",
                "echo"
            ),
            (
                "I become smaller every time I take a bath. What am I?",
                "soap"
            ),
        ],

        "Expert": [
            (
                "I am always in front of you but can never be seen. What am I?",
                "future"
            ),
            (
                "What can travel around the world while staying in one corner?",
                "stamp"
            ),
        ],
    }

    questions = riddles.get(
        difficulty,
        riddles["Beginner"]
    )

    return random.choice(questions)


# ---------------------------------------------------------
# Generate Quick Quiz Challenge
# ---------------------------------------------------------

def generate_quiz_challenge(difficulty):

    quizzes = {

        "Beginner": [
            (
                "How many days are there in a week?",
                "7"
            ),
            (
                "How many months are there in a year?",
                "12"
            ),
        ],

        "Easy": [
            (
                "What is the capital of India?",
                "new delhi"
            ),
            (
                "How many continents are there?",
                "7"
            ),
        ],

        "Medium": [
            (
                "Which planet is known as the Red Planet?",
                "mars"
            ),
            (
                "What is the largest ocean on Earth?",
                "pacific ocean"
            ),
        ],

        "Hard": [
            (
                "What is the chemical symbol for gold?",
                "au"
            ),
            (
                "Which gas do plants absorb during photosynthesis?",
                "carbon dioxide"
            ),
        ],

        "Expert": [
            (
                "What is the SI unit of electric resistance?",
                "ohm"
            ),
            (
                "What is the smallest prime number?",
                "2"
            ),
        ],
    }

    questions = quizzes.get(
        difficulty,
        quizzes["Beginner"]
    )

    return random.choice(questions)


# ---------------------------------------------------------
# Generate Challenge
# ---------------------------------------------------------

def generate_challenge_by_type(
    challenge_type,
    difficulty
):

    challenge_type = challenge_type.strip().lower()

    difficulty = difficulty.strip().title()

    if challenge_type == "math problems":
        return generate_math_challenge(difficulty)

    elif challenge_type == "logic puzzles":
        return generate_logic_challenge(difficulty)

    elif challenge_type == "memory challenge":
        return generate_memory_challenge(difficulty)

    elif challenge_type == "word games":
        return generate_word_challenge(difficulty)

    elif challenge_type == "pattern recognition":
        return generate_pattern_challenge(difficulty)

    elif challenge_type == "riddles":
        return generate_riddle_challenge(difficulty)

    elif challenge_type == "quick quiz":
        return generate_quiz_challenge(difficulty)

    else:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid challenge type. "
                "Choose Math Problems, Logic Puzzles, "
                "Memory Challenge, Word Games, "
                "Pattern Recognition, Riddles, or Quick Quiz."
            )
        )


# ---------------------------------------------------------
# Generate Challenge Request Model
# ---------------------------------------------------------

class GenerateChallengeRequest(BaseModel):

    challenge_type: str

    difficulty: str


# ---------------------------------------------------------
# Generate Challenge API
# ---------------------------------------------------------

@app.post("/generate-challenge")
def generate_challenge(
    request: GenerateChallengeRequest,
    current_user=Depends(get_current_user)
):

    valid_difficulties = [
        "Beginner",
        "Easy",
        "Medium",
        "Hard",
        "Expert"
    ]

    difficulty = request.difficulty.strip().title()

    if difficulty not in valid_difficulties:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid difficulty. "
                "Choose Beginner, Easy, Medium, Hard, or Expert."
            )
        )

    question, correct_answer = generate_challenge_by_type(
        request.challenge_type,
        difficulty
    )

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO challenges
            (
                challenge_type,
                difficulty,
                question,
                correct_answer
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s
            )
            RETURNING challenge_id
            """,
            (
                request.challenge_type,
                difficulty,
                question,
                correct_answer
            )
        )

        challenge_id = cursor.fetchone()[0]

        connection.commit()

        return {
            "message": "Challenge generated successfully",
            "challenge_id": challenge_id,
            "challenge_type": request.challenge_type,
            "difficulty": difficulty,
            "question": question
        }

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()

@app.post("/verify-wakeup")
def verify_wakeup(
    verification: WakeUpVerification,
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        # Check that the alarm belongs to the logged-in user
        cursor.execute(
            """
            SELECT user_id
            FROM alarms
            WHERE alarm_id = %s
            """,
            (verification.alarm_id,)
        )

        alarm = cursor.fetchone()

        if not alarm:
            raise HTTPException(
                status_code=404,
                detail="Alarm not found"
            )

        if alarm[0] != user_id:
            raise HTTPException(
                status_code=403,
                detail="You can only verify your own alarm"
            )

        # Check the challenge answer
        cursor.execute(
            """
            SELECT correct_answer
            FROM challenges
            WHERE challenge_id = %s
            """,
            (verification.challenge_id,)
        )

        challenge = cursor.fetchone()

        if not challenge:
            raise HTTPException(
                status_code=404,
                detail="Challenge not found"
            )

        correct_answer = str(challenge[0]).strip().lower()
        user_answer = str(verification.user_answer).strip().lower()

        if user_answer == correct_answer:
            return {
                "verified": True,
                "message": "Wake-up verified successfully. Alarm can be dismissed."
            }

        return {
            "verified": False,
            "message": "Incorrect answer. Please solve the challenge again."
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# MILESTONE 3 - BEHAVIORAL ANALYTICS
# ============================================================

class BehavioralEvent(BaseModel):
    event_type: str
    alarm_id: Optional[int] = None
    metadata: dict = {}


@app.post("/behavioral-events")
def record_behavioral_event(
    event: BehavioralEvent,
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO behavioral_events
                (user_id, alarm_id, event_type, metadata)
            VALUES
                (%s, %s, %s, %s::jsonb)
            RETURNING event_id, user_id, alarm_id, event_type, event_time, metadata
            """,
            (
                user_id,
                event.alarm_id,
                event.event_type,
                json.dumps(event.metadata)
            )
        )

        result = cursor.fetchone()
        connection.commit()

        return {
            "message": "Behavioral event recorded successfully",
            "event_id": result[0],
            "user_id": result[1],
            "alarm_id": result[2],
            "event_type": result[3],
            "event_time": result[4],
            "metadata": result[5]
        }

    except Exception as e:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


@app.get("/behavioral-events")
def get_behavioral_events(
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                event_id,
                alarm_id,
                event_type,
                event_time,
                metadata
            FROM behavioral_events
            WHERE user_id = %s
            ORDER BY event_time DESC
            """,
            (user_id,)
        )

        events = cursor.fetchall()

        return {
            "events": [
                {
                    "event_id": row[0],
                    "alarm_id": row[1],
                    "event_type": row[2],
                    "event_time": row[3],
                    "metadata": row[4]
                }
                for row in events
            ]
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()



@app.get("/streaks")
def get_streaks(current_user=Depends(get_current_user)):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT DISTINCT event_time::date AS completion_date
            FROM behavioral_events
            WHERE user_id = %s
              AND event_type = 'challenge_completed'
            ORDER BY completion_date DESC
            """,
            (user_id,)
        )

        completion_dates = sorted({
            row[0] for row in cursor.fetchall()
        })

        if not completion_dates:
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "last_completed_date": None
            }

        # Calculate the longest streak in the complete history.
        longest_streak = 1
        running_streak = 1

        for index in range(1, len(completion_dates)):
            difference = (
                completion_dates[index] -
                completion_dates[index - 1]
            ).days

            if difference == 1:
                running_streak += 1
            else:
                running_streak = 1

            longest_streak = max(
                longest_streak,
                running_streak
            )

        # Calculate the current streak.
        today = date.today()
        latest_date = completion_dates[-1]
        current_streak = 0

        # A streak remains active if the last completion
        # happened today or yesterday.
        if latest_date >= today - timedelta(days=1):
            current_streak = 1
            expected_date = latest_date - timedelta(days=1)

            for completed_date in reversed(completion_dates[:-1]):
                if completed_date == expected_date:
                    current_streak += 1
                    expected_date -= timedelta(days=1)
                elif completed_date < expected_date:
                    break

        return {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "last_completed_date": latest_date.isoformat()
        }

    except Exception as e:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()



# ============================================================
# MILESTONE 3 - ADAPTIVE DIFFICULTY ENGINE
# ============================================================

class AdaptiveDifficultyRequest(BaseModel):
    challenge_type: str
    previous_difficulty: str
    accuracy: float


DIFFICULTY_LEVELS = [
    "Beginner",
    "Easy",
    "Medium",
    "Hard",
    "Expert"
]


@app.post("/adaptive-difficulty")
def calculate_adaptive_difficulty(
    request: AdaptiveDifficultyRequest,
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        challenge_type = request.challenge_type.strip()
        previous_difficulty = request.previous_difficulty.strip()

        accuracy = float(request.accuracy)

        # ----------------------------------------------------
        # Validate accuracy
        # ----------------------------------------------------

        if accuracy < 0 or accuracy > 100:
            raise HTTPException(
                status_code=400,
                detail="Accuracy must be between 0 and 100"
            )

        # ----------------------------------------------------
        # Validate previous difficulty
        # ----------------------------------------------------

        if previous_difficulty not in DIFFICULTY_LEVELS:
            raise HTTPException(
                status_code=400,
                detail="Invalid difficulty level"
            )

        current_index = DIFFICULTY_LEVELS.index(
            previous_difficulty
        )

        # ----------------------------------------------------
        # Adaptive difficulty rules
        # ----------------------------------------------------
        #
        # Accuracy below 50%
        # → decrease difficulty
        #
        # Accuracy 50% to 79%
        # → keep same difficulty
        #
        # Accuracy 80% or above
        # → increase difficulty
        # ----------------------------------------------------

        if accuracy < 50:

            new_index = max(
                0,
                current_index - 1
            )

            reason = (
                "Accuracy is below 50%, so the next challenge "
                "difficulty was reduced to support improvement."
            )

        elif accuracy < 80:

            new_index = current_index

            reason = (
                "Accuracy is between 50% and 79%, so the "
                "challenge difficulty remains unchanged."
            )

        else:

            new_index = min(
                len(DIFFICULTY_LEVELS) - 1,
                current_index + 1
            )

            reason = (
                "Accuracy is 80% or above, so the next challenge "
                "difficulty was increased."
            )

        new_difficulty = DIFFICULTY_LEVELS[new_index]

        # ----------------------------------------------------
        # Save adaptive difficulty decision
        # ----------------------------------------------------

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO adaptive_difficulty
                (
                    user_id,
                    challenge_type,
                    previous_difficulty,
                    new_difficulty,
                    accuracy,
                    reason
                )
            VALUES
                (%s, %s, %s, %s, %s, %s)
            RETURNING
                id,
                user_id,
                challenge_type,
                previous_difficulty,
                new_difficulty,
                accuracy,
                reason,
                created_at
            """,
            (
                user_id,
                challenge_type,
                previous_difficulty,
                new_difficulty,
                accuracy,
                reason
            )
        )

        result = cursor.fetchone()

        connection.commit()

        return {
            "message": "Adaptive difficulty calculated successfully",
            "user_id": result[1],
            "challenge_type": result[2],
            "previous_difficulty": result[3],
            "new_difficulty": result[4],
            "accuracy": float(result[5]),
            "reason": result[6],
            "created_at": result[7]
        }

    except HTTPException:
        raise

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()

# =========================================================
# GENERATE ADAPTIVE CHALLENGE
# =========================================================

class AdaptiveChallengeRequest(BaseModel):
    challenge_type: str
    previous_difficulty: str


@app.post("/generate-adaptive-challenge")
def generate_adaptive_challenge(
    request: AdaptiveChallengeRequest,
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        challenge_type = request.challenge_type.strip()
        previous_difficulty = request.previous_difficulty.strip().title()

        # -------------------------------------------------
        # Validate difficulty
        # -------------------------------------------------

        if previous_difficulty not in DIFFICULTY_LEVELS:
            raise HTTPException(
                status_code=400,
                detail="Invalid difficulty level"
            )

        # -------------------------------------------------
        # Get user's previous challenge performance
        # -------------------------------------------------

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_attempts,
                COALESCE(
                    SUM(
                        CASE
                            WHEN is_correct = TRUE THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS correct_answers
            FROM challenge_attempts
            WHERE user_id = %s
            """,
            (user_id,)
        )

        performance = cursor.fetchone()

        total_attempts = performance[0]
        correct_answers = performance[1]

        # -------------------------------------------------
        # Calculate accuracy
        # -------------------------------------------------

        if total_attempts > 0:
            accuracy = round(
                (correct_answers / total_attempts) * 100,
                2
            )
        else:
            # New user: keep the configured difficulty
            accuracy = 0

        # -------------------------------------------------
        # Adaptive difficulty decision
        # -------------------------------------------------

        current_index = DIFFICULTY_LEVELS.index(
            previous_difficulty
        )

        if total_attempts == 0:

            new_index = current_index

            reason = (
                "No previous challenge attempts were found, "
                "so the configured difficulty was kept."
            )

        elif accuracy < 50:

            new_index = max(
                0,
                current_index - 1
            )

            reason = (
                "Accuracy is below 50%, so the next challenge "
                "difficulty was reduced to support improvement."
            )

        elif accuracy < 80:

            new_index = current_index

            reason = (
                "Accuracy is between 50% and 79%, so the "
                "challenge difficulty remains unchanged."
            )

        else:

            new_index = min(
                len(DIFFICULTY_LEVELS) - 1,
                current_index + 1
            )

            reason = (
                "Accuracy is 80% or above, so the next challenge "
                "difficulty was increased."
            )

        new_difficulty = DIFFICULTY_LEVELS[new_index]

        # -------------------------------------------------
        # Save adaptive difficulty decision
        # -------------------------------------------------

        cursor.execute(
            """
            INSERT INTO adaptive_difficulty
            (
                user_id,
                challenge_type,
                previous_difficulty,
                new_difficulty,
                accuracy,
                reason
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                user_id,
                challenge_type,
                previous_difficulty,
                new_difficulty,
                accuracy,
                reason
            )
        )

        # -------------------------------------------------
        # Generate a fresh challenge
        # -------------------------------------------------

        question, correct_answer = generate_challenge_by_type(
            challenge_type,
            new_difficulty
        )

        # -------------------------------------------------
        # Save the fresh challenge
        # -------------------------------------------------

        cursor.execute(
            """
            INSERT INTO challenges
            (
                challenge_type,
                difficulty,
                question,
                correct_answer
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s
            )
            RETURNING challenge_id
            """,
            (
                challenge_type,
                new_difficulty,
                question,
                correct_answer
            )
        )

        challenge_id = cursor.fetchone()[0]

        connection.commit()

        # -------------------------------------------------
        # Return adaptive challenge
        # -------------------------------------------------

        return {
            "message": "Adaptive challenge generated successfully",
            "challenge_id": challenge_id,
            "challenge_type": challenge_type,
            "previous_difficulty": previous_difficulty,
            "difficulty": new_difficulty,
            "accuracy": accuracy,
            "total_attempts": total_attempts,
            "correct_answers": correct_answers,
            "reason": reason,
            "question": question
        }

    except HTTPException:
        raise

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


@app.get("/adaptive-difficulty")
def get_adaptive_difficulty_history(
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                challenge_type,
                previous_difficulty,
                new_difficulty,
                accuracy,
                reason,
                created_at
            FROM adaptive_difficulty
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,)
        )

        records = cursor.fetchall()

        return {
            "history": [
                {
                    "id": row[0],
                    "challenge_type": row[1],
                    "previous_difficulty": row[2],
                    "new_difficulty": row[3],
                    "accuracy": float(row[4]),
                    "reason": row[5],
                    "created_at": row[6]
                }
                for row in records
            ]
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()

# ============================================================
# MILESTONE 3 - HABIT SCORING
# ============================================================

# ============================================================
# MILESTONE 3 - AUTOMATIC HABIT SCORING
# ============================================================

class HabitScoreRequest(BaseModel):
    """
    Optional manual override for testing.

    The normal dashboard does NOT need to send these values.
    When they are omitted, the backend calculates the scores
    automatically from real behavioral data.
    """

    wake_up_consistency: Optional[float] = None
    challenge_success: Optional[float] = None
    snooze_reduction: Optional[float] = None
    sleep_adherence: Optional[float] = None


def calculate_automatic_habit_metrics(
    cursor,
    user_id: int
):
    """
    Calculate the four habit metrics automatically from
    the user's real stored behavioral data.

    Project weights:
        Wake-up consistency = 35%
        Challenge completion success = 25%
        Snooze reduction = 20%
        Sleep schedule adherence = 20%
    """

    # ========================================================
    # 1. WAKE-UP CONSISTENCY
    # ========================================================
    #
    # We use alarm_triggered events as the denominator and
    # challenge_completed events as successful wake-ups.
    #
    # If there are no alarm events yet, the metric starts at 0.
    # ========================================================

    cursor.execute(
        """
        SELECT
            COUNT(*) FILTER (
                WHERE event_type = 'alarm_triggered'
            ) AS alarm_count,

            COUNT(*) FILTER (
                WHERE event_type = 'challenge_completed'
            ) AS completed_count

        FROM behavioral_events
        WHERE user_id = %s
        """,
        (user_id,)
    )

    wake_data = cursor.fetchone()

    alarm_count = int(wake_data[0] or 0)
    completed_count = int(wake_data[1] or 0)

    if alarm_count > 0:
        wake_up_consistency = min(
            100,
            round(
                (completed_count / alarm_count) * 100,
                2
            )
        )
    else:
        wake_up_consistency = 0.0

    # ========================================================
    # 2. CHALLENGE SUCCESS
    # ========================================================
    #
    # challenge_completed + challenge_failed are the actual
    # wake-up challenge attempts.
    # ========================================================

    cursor.execute(
        """
        SELECT
            COUNT(*) FILTER (
                WHERE event_type = 'challenge_completed'
            ) AS completed_count,

            COUNT(*) FILTER (
                WHERE event_type = 'challenge_failed'
            ) AS failed_count

        FROM behavioral_events
        WHERE user_id = %s
        """,
        (user_id,)
    )

    challenge_data = cursor.fetchone()

    challenge_completed = int(
        challenge_data[0] or 0
    )

    challenge_failed = int(
        challenge_data[1] or 0
    )

    challenge_attempts = (
        challenge_completed +
        challenge_failed
    )

    if challenge_attempts > 0:
        challenge_success = round(
            (
                challenge_completed /
                challenge_attempts
            ) * 100,
            2
        )
    else:
        challenge_success = 0.0

    # ========================================================
    # 3. SNOOZE REDUCTION
    # ========================================================
    #
    # We calculate the user's snooze behavior relative to
    # their configured snooze limit.
    #
    # Fewer snoozes = higher score.
    #
    # If there are no snooze events, the user receives 100
    # for this component because no snoozing has been recorded.
    # ========================================================

    cursor.execute(
        """
        SELECT
            COUNT(*) AS snooze_count
        FROM behavioral_events
        WHERE user_id = %s
          AND event_type = 'snooze'
        """,
        (user_id,)
    )

    snooze_data = cursor.fetchone()

    snooze_count = int(
        snooze_data[0] or 0
    )

    cursor.execute(
        """
        SELECT
            COALESCE(
                AVG(snooze_limit),
                3
            )
        FROM alarms
        WHERE user_id = %s
        """,
        (user_id,)
    )

    snooze_limit_data = cursor.fetchone()

    average_snooze_limit = float(
        snooze_limit_data[0] or 3
    )

    if average_snooze_limit <= 0:
        average_snooze_limit = 3

    if snooze_count == 0:
        snooze_reduction = 100.0
    else:
        snooze_usage_ratio = (
            snooze_count /
            average_snooze_limit
        )

        snooze_reduction = round(
            max(
                0,
                min(
                    100,
                    (1 - snooze_usage_ratio) * 100
                )
            ),
            2
        )

    # ========================================================
    # 4. SLEEP SCHEDULE ADHERENCE
    # ========================================================
    #
    # The current profile stores the user's planned sleep
    # duration. We compare that with actual sleep-related
    # behavioral information when available.
    #
    # For users without enough sleep-event history yet,
    # the configured sleep duration is treated as the planned
    # baseline and receives a neutral adherence score of 100.
    # ========================================================

    cursor.execute(
        """
        SELECT
            sleep_duration_minutes,
            sleep_time,
            wake_up_time
        FROM user_profiles
        WHERE user_id = %s
        """,
        (user_id,)
    )

    profile_data = cursor.fetchone()

    if profile_data:
        sleep_duration_minutes = int(
            profile_data[0] or 480
        )

        sleep_time_value = profile_data[1]
        wake_up_time_value = profile_data[2]

        # ----------------------------------------------------
        # Check whether the configured sleep duration is valid.
        # A normal target is between 4 and 12 hours.
        # ----------------------------------------------------

        if (
            sleep_duration_minutes >= 240
            and sleep_duration_minutes <= 720
            and sleep_time_value is not None
            and wake_up_time_value is not None
        ):
            sleep_adherence = 100.0
        else:
            sleep_adherence = 50.0
    else:
        sleep_adherence = 50.0

    # ========================================================
    # 5. OVERALL HABIT SCORE
    # ========================================================

    overall_score = round(
        (wake_up_consistency * 0.35) +
        (challenge_success * 0.25) +
        (snooze_reduction * 0.20) +
        (sleep_adherence * 0.20),
        2
    )

    return {
        "wake_up_consistency": wake_up_consistency,
        "challenge_success": challenge_success,
        "snooze_reduction": snooze_reduction,
        "sleep_adherence": sleep_adherence,
        "overall_score": overall_score
    }


@app.post("/habit-score")
def calculate_habit_score(
    request: HabitScoreRequest,
    current_user=Depends(get_current_user)
):
    """
    Calculate and store the user's habit score.

    By default, the score is calculated automatically from
    behavioral_events, alarms and user_profiles.

    Manual values are accepted only when explicitly supplied,
    which keeps the endpoint useful for controlled testing.
    """

    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        # ====================================================
        # AUTOMATIC CALCULATION
        # ====================================================

        metrics = calculate_automatic_habit_metrics(
            cursor,
            user_id
        )

        # ====================================================
        # OPTIONAL MANUAL OVERRIDE
        # ====================================================
        #
        # If the request contains a metric explicitly, use it.
        # Otherwise keep the automatically calculated value.
        # ====================================================

        if request.wake_up_consistency is not None:
            metrics["wake_up_consistency"] = float(
                request.wake_up_consistency
            )

        if request.challenge_success is not None:
            metrics["challenge_success"] = float(
                request.challenge_success
            )

        if request.snooze_reduction is not None:
            metrics["snooze_reduction"] = float(
                request.snooze_reduction
            )

        if request.sleep_adherence is not None:
            metrics["sleep_adherence"] = float(
                request.sleep_adherence
            )

        # ====================================================
        # VALIDATE VALUES
        # ====================================================

        for name, score in metrics.items():

            if (
                name != "overall_score"
                and (
                    score < 0
                    or score > 100
                )
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"{name} must be between "
                        "0 and 100"
                    )
                )

        # ====================================================
        # RECALCULATE FINAL WEIGHTED SCORE
        # ====================================================

        metrics["overall_score"] = round(
            (metrics["wake_up_consistency"] * 0.35) +
            (metrics["challenge_success"] * 0.25) +
            (metrics["snooze_reduction"] * 0.20) +
            (metrics["sleep_adherence"] * 0.20),
            2
        )

        # ====================================================
        # SAVE HABIT SCORE
        # ====================================================

        cursor.execute(
            """
            INSERT INTO habit_scores
            (
                user_id,
                wake_up_consistency,
                challenge_success,
                snooze_reduction,
                sleep_adherence,
                overall_score
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            RETURNING
                id,
                user_id,
                wake_up_consistency,
                challenge_success,
                snooze_reduction,
                sleep_adherence,
                overall_score,
                created_at
            """,
            (
                user_id,
                metrics["wake_up_consistency"],
                metrics["challenge_success"],
                metrics["snooze_reduction"],
                metrics["sleep_adherence"],
                metrics["overall_score"]
            )
        )

        result = cursor.fetchone()

        connection.commit()

        return {
            "message": (
                "Habit score calculated automatically "
                "from behavioral data"
            ),
            "user_id": result[1],
            "wake_up_consistency": float(result[2]),
            "challenge_success": float(result[3]),
            "snooze_reduction": float(result[4]),
            "sleep_adherence": float(result[5]),
            "overall_score": float(result[6]),
            "created_at": result[7]
        }

    except HTTPException:
        raise

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


@app.get("/habit-score")
def get_habit_score_history(
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                wake_up_consistency,
                challenge_success,
                snooze_reduction,
                sleep_adherence,
                overall_score,
                created_at
            FROM habit_scores
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,)
        )

        records = cursor.fetchall()

        return {
            "history": [
                {
                    "id": row[0],
                    "wake_up_consistency": float(row[1]),
                    "challenge_success": float(row[2]),
                    "snooze_reduction": float(row[3]),
                    "sleep_adherence": float(row[4]),
                    "overall_score": float(row[5]),
                    "created_at": row[6]
                }
                for row in records
            ]
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()
@app.get("/coach/habit-scores")
def get_coach_habit_scores(
    current_user=Depends(require_wellness_coach)
):
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                u.user_id,
                u.name,
                u.email,
                hs.wake_up_consistency,
                hs.challenge_success,
                hs.snooze_reduction,
                hs.sleep_adherence,
                hs.overall_score,
                hs.created_at
            FROM users u
            LEFT JOIN LATERAL (
                SELECT
                    wake_up_consistency,
                    challenge_success,
                    snooze_reduction,
                    sleep_adherence,
                    overall_score,
                    created_at
                FROM habit_scores
                WHERE user_id = u.user_id
                ORDER BY created_at DESC
                LIMIT 1
            ) hs ON TRUE
            WHERE u.role IN ('user', 'wellness_coach')
            ORDER BY u.user_id
            """
        )

        records = cursor.fetchall()

        return {
            "success": True,
            "users": [
                {
                    "user_id": row[0],
                    "name": row[1],
                    "email": row[2],

"wake_up_consistency": (
    float(row[3]) if row[3] is not None else None
),
"challenge_success": (
    float(row[4]) if row[4] is not None else None
),
"snooze_reduction": (
    float(row[5]) if row[5] is not None else None
),
"sleep_adherence": (
    float(row[6]) if row[6] is not None else None
),
"overall_score": (
    float(row[7]) if row[7] is not None else None
),

                    "created_at": row[8]
                }
                for row in records
            ]
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# MILESTONE 3 - RECOMMENDATION ENGINE
# ============================================================

class RecommendationRequest(BaseModel):
    wake_up_consistency: float
    challenge_success: float
    snooze_reduction: float
    sleep_adherence: float
    overall_score: float


@app.post("/recommendations/generate")
def generate_recommendations(
    request: RecommendationRequest,
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        scores = {
            "wake_up_consistency": float(request.wake_up_consistency),
            "challenge_success": float(request.challenge_success),
            "snooze_reduction": float(request.snooze_reduction),
            "sleep_adherence": float(request.sleep_adherence),
            "overall_score": float(request.overall_score)
        }

        # ----------------------------------------------------
        # Validate scores
        # ----------------------------------------------------

        for name, score in scores.items():
            if score < 0 or score > 100:
                raise HTTPException(
                    status_code=400,
                    detail=f"{name} must be between 0 and 100"
                )

        recommendations = []

        # ----------------------------------------------------
        # Wake-up consistency
        # ----------------------------------------------------

        if scores["wake_up_consistency"] < 50:
            recommendations.append({
                "type": "Wake-up Consistency",
                "text": (
                    "Try to wake up at the same time every day "
                    "to improve your wake-up consistency."
                ),
                "priority": "High"
            })

        elif scores["wake_up_consistency"] < 80:
            recommendations.append({
                "type": "Wake-up Consistency",
                "text": (
                    "Your wake-up consistency can improve by "
                    "following a more regular morning schedule."
                ),
                "priority": "Medium"
            })

        # ----------------------------------------------------
        # Challenge performance
        # ----------------------------------------------------

        if scores["challenge_success"] < 50:
            recommendations.append({
                "type": "Cognitive Challenge",
                "text": (
                    "Try practicing easier cognitive challenges "
                    "regularly before increasing difficulty."
                ),
                "priority": "High"
            })

        elif scores["challenge_success"] < 80:
            recommendations.append({
                "type": "Cognitive Challenge",
                "text": (
                    "Continue solving cognitive challenges regularly "
                    "to improve your success rate."
                ),
                "priority": "Medium"
            })

        else:
            recommendations.append({
                "type": "Cognitive Challenge",
                "text": (
                    "Your challenge performance is strong. "
                    "You can gradually practice harder challenges."
                ),
                "priority": "Low"
            })

        # ----------------------------------------------------
        # Snooze behavior
        # ----------------------------------------------------

        if scores["snooze_reduction"] < 50:
            recommendations.append({
                "type": "Snooze Reduction",
                "text": (
                    "Try reducing the number of times you snooze "
                    "your alarm to improve wake-up discipline."
                ),
                "priority": "High"
            })

        elif scores["snooze_reduction"] < 80:
            recommendations.append({
                "type": "Snooze Reduction",
                "text": (
                    "Continue reducing snooze usage gradually "
                    "to build a more consistent morning routine."
                ),
                "priority": "Medium"
            })

        # ----------------------------------------------------
        # Sleep schedule
        # ----------------------------------------------------

        if scores["sleep_adherence"] < 50:
            recommendations.append({
                "type": "Sleep Schedule",
                "text": (
                    "Try maintaining a more regular sleep schedule "
                    "to improve sleep adherence."
                ),
                "priority": "High"
            })

        elif scores["sleep_adherence"] < 80:
            recommendations.append({
                "type": "Sleep Schedule",
                "text": (
                    "Try following your planned sleep time more "
                    "consistently."
                ),
                "priority": "Medium"
            })

        # ----------------------------------------------------
        # Overall habit score
        # ----------------------------------------------------

        if scores["overall_score"] >= 80:
            recommendations.append({
                "type": "Overall Progress",
                "text": (
                    "Your overall habit score is strong. "
                    "Continue maintaining your current routine."
                ),
                "priority": "Low"
            })

        elif scores["overall_score"] < 50:
            recommendations.append({
                "type": "Overall Progress",
                "text": (
                    "Focus on one or two habits at a time and "
                    "build a consistent daily routine."
                ),
                "priority": "High"
            })

        else:
            recommendations.append({
                "type": "Overall Progress",
                "text": (
                    "Your habits are developing. Continue making "
                    "small improvements consistently."
                ),
                "priority": "Medium"
            })

                # ----------------------------------------------------
        # Save recommendations
        # ----------------------------------------------------

        connection = get_connection()
        cursor = connection.cursor()

        saved_recommendations = []

        for recommendation in recommendations:

            cursor.execute(
                """
                SELECT
                    id,
                    recommendation_type,
                    recommendation_text,
                    priority,
                    created_at,
                    is_completed
                FROM recommendations
                WHERE user_id = %s
                  AND recommendation_type = %s
                  AND is_completed = FALSE
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (
                    user_id,
                    recommendation["type"]
                )
            )

            existing = cursor.fetchone()

            if existing:
                cursor.execute(
                    """
                    UPDATE recommendations
                    SET
                        recommendation_text = %s,
                        priority = %s
                    WHERE id = %s
                    RETURNING
                        id,
                        recommendation_type,
                        recommendation_text,
                        priority,
                        created_at,
                        is_completed
                    """,
                    (
                        recommendation["text"],
                        recommendation["priority"],
                        existing[0]
                    )
                )

                result = cursor.fetchone()

            else:
                cursor.execute(
                    """
                    INSERT INTO recommendations
                        (
                            user_id,
                            recommendation_type,
                            recommendation_text,
                            priority
                        )
                    VALUES
                        (%s, %s, %s, %s)
                    RETURNING
                        id,
                        recommendation_type,
                        recommendation_text,
                        priority,
                        created_at,
                        is_completed
                    """,
                    (
                        user_id,
                        recommendation["type"],
                        recommendation["text"],
                        recommendation["priority"]
                    )
                )

                result = cursor.fetchone()

            saved_recommendations.append({
                "id": result[0],
                "type": result[1],
                "text": result[2],
                "priority": result[3],
                "created_at": result[4],
                "is_completed": result[5]
            })

        connection.commit()

        return {
            "message": "Recommendations generated successfully",
            "overall_score": scores["overall_score"],
            "recommendations": saved_recommendations
        }

    except HTTPException:
        raise

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


@app.get("/recommendations")
def get_recommendations(
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                recommendation_type,
                recommendation_text,
                priority,
                created_at,
                is_completed
            FROM recommendations
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,)
        )

        records = cursor.fetchall()

        return {
            "recommendations": [
                {
                    "id": row[0],
                    "type": row[1],
                    "text": row[2],
                    "priority": row[3],
                    "created_at": row[4],
                    "is_completed": row[5]
                }
                for row in records
            ]
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()

@app.post("/notifications")
def create_notification(
    notification_type: str,
    title: str,
    message: str,
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO notifications
            (user_id, notification_type, title, message)
            VALUES (%s, %s, %s, %s)
            RETURNING notification_id, created_at
            """,
            (user_id, notification_type, title, message)
        )

        record = cursor.fetchone()
        connection.commit()

        return {
            "success": True,
            "notification": {
                "notification_id": record[0],
                "created_at": record[1]
            }
        }

    except Exception as e:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()

@app.post("/notifications/announcement")
def create_platform_announcement(
    title: str,
    message: str,
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO notifications
            (
                user_id,
                notification_type,
                title,
                message
            )
            SELECT
                user_id,
                'announcement',
                %s,
                %s
            FROM users
            RETURNING notification_id
            """,
            (title, message)
        )

        created_notifications = cursor.fetchall()

        connection.commit()

        return {
            "success": True,
            "message": "Platform announcement sent successfully",
            "notifications_created": len(created_notifications)
        }

    except Exception as e:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()

@app.get("/notifications")
def get_notifications(
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                notification_id,
                notification_type,
                title,
                message,
                is_read,
                created_at
            FROM notifications
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,)
        )

        records = cursor.fetchall()

        return {
            "notifications": [
                {
                    "notification_id": row[0],
                    "notification_type": row[1],
                    "title": row[2],
                    "message": row[3],
                    "is_read": row[4],
                    "created_at": row[5]
                }
                for row in records
            ]
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()

@app.put("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE notifications
            SET is_read = TRUE
            WHERE notification_id = %s
              AND user_id = %s
            RETURNING notification_id
            """,
            (notification_id, user_id)
        )

        record = cursor.fetchone()

        if not record:
            raise HTTPException(
                status_code=404,
                detail="Notification not found"
            )

        connection.commit()

        return {
            "success": True,
            "message": "Notification marked as read"
        }

    except HTTPException:
        if connection:
            connection.rollback()
        raise

    except Exception as e:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()

@app.put("/recommendations/{recommendation_id}/complete")
def complete_recommendation(
    recommendation_id: int,
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE recommendations
            SET is_completed = TRUE
            WHERE id = %s
              AND user_id = %s
            RETURNING
                id,
                recommendation_type,
                recommendation_text,
                priority,
                created_at,
                is_completed
            """,
            (
                recommendation_id,
                user_id
            )
        )

        result = cursor.fetchone()

        if not result:
            raise HTTPException(
                status_code=404,
                detail="Recommendation not found"
            )

        connection.commit()

        return {
            "message": "Recommendation marked as completed",
            "recommendation": {
                "id": result[0],
                "type": result[1],
                "text": result[2],
                "priority": result[3],
                "created_at": result[4],
                "is_completed": result[5]
            }
        }

    except HTTPException:
        raise

    except Exception as e:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()

@app.post("/ml/predict-difficulty")
def ml_predict_difficulty(data: dict):
    result = predict_difficulty(
        accuracy=float(data.get("accuracy", 0)),
        attempts=int(data.get("attempts", 0)),
        snoozes=int(data.get("snoozes", 0)),
        completion_rate=float(data.get("completion_rate", 0))
    )

    return {
        "success": True,
        "ml_prediction": result
    }

@app.get("/ml/predict-user-difficulty")
def predict_user_difficulty(
    current_user=Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        user_id = current_user.get("user_id")

        connection = get_connection()
        cursor = connection.cursor()

        # Get challenge analytics
        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_attempts,
                COALESCE(
                    SUM(CASE WHEN is_correct = TRUE THEN 1 ELSE 0 END),
                    0
                ) AS correct_answers
            FROM challenge_attempts
            WHERE user_id = %s
            """,
            (user_id,)
        )

        challenge_data = cursor.fetchone()

        total_attempts = challenge_data[0]
        correct_answers = challenge_data[1]

        if total_attempts > 0:
            accuracy = round(
                (correct_answers / total_attempts) * 100,
                2
            )
        else:
            accuracy = 0

        # Get behavioral data
        cursor.execute(
            """
            SELECT
                COUNT(*) FILTER (
                    WHERE event_type = 'snooze'
                ) AS snoozes,

                COUNT(*) FILTER (
                    WHERE event_type = 'challenge_completed'
                ) AS completed,

                COUNT(*) FILTER (
                    WHERE event_type = 'challenge_failed'
                ) AS failed

            FROM behavioral_events
            WHERE user_id = %s
            """,
            (user_id,)
        )

        behavior_data = cursor.fetchone()

        snoozes = behavior_data[0] or 0
        completed = behavior_data[1] or 0
        failed = behavior_data[2] or 0

        total_challenges = completed + failed

        if total_challenges > 0:
            completion_rate = round(
                (completed / total_challenges) * 100,
                2
            )
        else:
            completion_rate = 0

        # Run ML prediction
        result = predict_difficulty(
            accuracy=accuracy,
            attempts=total_attempts,
            snoozes=snoozes,
            completion_rate=completion_rate
        )

        return {
            "user_id": user_id,
            "input_data": {
                "accuracy": accuracy,
                "attempts": total_attempts,
                "snoozes": snoozes,
                "completion_rate": completion_rate
            },
            "ml_prediction": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()