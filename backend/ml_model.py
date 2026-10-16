import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score


# ---------------------------------------------------------
# 1. TRAINING DATA
# ---------------------------------------------------------
# Features:
# accuracy_percentage
# total_attempts
# snooze_count
# completion_rate
#
# Target:
# recommended difficulty
#
# Difficulty:
# 0 = Beginner
# 1 = Easy
# 2 = Medium
# 3 = Hard
# 4 = Expert

training_data = pd.DataFrame({
    "accuracy": [
        20, 30, 35, 40, 45,
        50, 55, 60, 65, 70,
        75, 80, 85, 90, 95,
        98
    ],
    "attempts": [
        1, 2, 2, 3, 3,
        4, 4, 5, 5, 6,
        6, 7, 7, 8, 9,
        10
    ],
    "snoozes": [
        5, 5, 4, 4, 3,
        3, 3, 2, 2, 2,
        2, 1, 1, 1, 0,
        0
    ],
    "completion_rate": [
        20, 25, 30, 35, 40,
        45, 50, 55, 60, 65,
        70, 75, 80, 85, 95,
        100
    ],
    "difficulty": [
        0, 0, 0, 0, 1,
        1, 1, 2, 2, 2,
        3, 3, 3, 4, 4,
        4
    ]
})


# ---------------------------------------------------------
# 2. PREPARE DATA
# ---------------------------------------------------------

X = training_data[
    [
        "accuracy",
        "attempts",
        "snoozes",
        "completion_rate"
    ]
]

y = training_data["difficulty"]


# ---------------------------------------------------------
# 3. TRAIN ML MODEL
# ---------------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.35, random_state=42, stratify=y
)

model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

model.fit(X_train, y_train)


# ---------------------------------------------------------
# 4. MODEL VALIDATION
# ---------------------------------------------------------

predictions = model.predict(X_test)

model_accuracy = accuracy_score(
    y_test,
    predictions
)


# ---------------------------------------------------------
# 5. DIFFICULTY LABELS
# ---------------------------------------------------------

DIFFICULTY_LABELS = {
    0: "Beginner",
    1: "Easy",
    2: "Medium",
    3: "Hard",
    4: "Expert"
}


# ---------------------------------------------------------
# 6. PREDICT DIFFICULTY
# ---------------------------------------------------------

def predict_difficulty(
    accuracy,
    attempts,
    snoozes,
    completion_rate
):
    input_data = pd.DataFrame(
        [[
            accuracy,
            attempts,
            snoozes,
            completion_rate
        ]],
        columns=[
            "accuracy",
            "attempts",
            "snoozes",
            "completion_rate"
        ]
    )

    prediction = model.predict(input_data)[0]

    probability = model.predict_proba(input_data)[0]

    confidence = float(np.max(probability))

    return {
        "difficulty": DIFFICULTY_LABELS[int(prediction)],
        "confidence": round(confidence * 100, 2),
        "model_accuracy": round(model_accuracy * 100, 2)
    }


# ---------------------------------------------------------
# 7. TEST
# ---------------------------------------------------------

if __name__ == "__main__":

    result = predict_difficulty(
        accuracy=77.78,
        attempts=9,
        snoozes=2,
        completion_rate=77.78
    )

    print("ML Adaptive Difficulty Result")
    print("--------------------------------")
    print("Recommended Difficulty:",
          result["difficulty"])

    print("Prediction Confidence:",
          result["confidence"], "%")

    print("Model Test Accuracy:",
          result["model_accuracy"], "%")