import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./index.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8001";


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function getUserIdFromToken() {
  const token = localStorage.getItem("token");

  if (!token) return null;

  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    return payload.user_id;
  } catch (error) {
    return null;
  }
}

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function formatAlarmTime(time) {
  if (!time) return "";

  const parts = time.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];

  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  if (hours === 0) {
    hours = 12;
  }

  return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
}



/* =========================================================
   MAIN APP
========================================================= */

function App() {
  console.log("APP IS RUNNING");
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  const [showRegister, setShowRegister] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPortal, setSelectedPortal] = useState(null);
  const snoozeTimerRef = useRef(null);
  const [name, setName] = useState("");

  const [message, setMessage] = useState("");


  /* PROFILE */

  const [activePage, setActivePage] = useState("dashboard");


  const [appearance, setAppearance] = useState(
  localStorage.getItem("settings_appearance") || "Dark"
);



  const [wakeUpTime, setWakeUpTime] = useState("");
  const [sleepTime, setSleepTime] = useState("");

  const [preferredChallengeType, setPreferredChallengeType] =
    useState("Logic Puzzles");

  const [preferredDifficulty, setPreferredDifficulty] =
    useState("Beginner");

  const [profileMessage, setProfileMessage] = useState("");
const [sleepDurationMinutes, setSleepDurationMinutes] = useState(480);
const [timeZone, setTimeZone] = useState("Asia/Kolkata");
const [productivityGoals, setProductivityGoals] = useState("");
const [habitPreferences, setHabitPreferences] = useState("");

    /* ALARM SCHEDULING */

const [alarmTime, setAlarmTime] = useState("");
const [alarmName, setAlarmName] = useState("");
const [alarms, setAlarms] = useState([]);
const [alarmMessage, setAlarmMessage] = useState("");
const [alarmType, setAlarmType] = useState("Daily Alarm");
const [recurrenceDays, setRecurrenceDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
const [alarmDate, setAlarmDate] = useState("");
const [alarmTimeZone, setAlarmTimeZone] = useState("Asia/Kolkata");
const [smartWindowMinutes, setSmartWindowMinutes] = useState(30);
const [snoozeLimit, setSnoozeLimit] = useState(3);
const [alarmSettings, setAlarmSettings] = useState(() => {
  try { return JSON.parse(localStorage.getItem("alarmSettings") || "{}"); } catch { return {}; }
});
/* M4 ML ADAPTIVE DIFFICULTY */

const [mlPrediction, setMlPrediction] = useState(null);
const [coachHabitScores, setCoachHabitScores] = useState([]);
const [notifications, setNotifications] = useState([]);
const [adminUsers, setAdminUsers] = useState([]);
const [userRole, setUserRole] = useState("");
const [adminLoading, setAdminLoading] = useState(false);
const [adminAnalytics, setAdminAnalytics] = useState(null);

const [adminChallengePerformance, setAdminChallengePerformance] = useState({
  total_challenge_types: 0,
  analytics: [],
});

const [notificationLoading, setNotificationLoading] = useState(false);
const [showNotifications, setShowNotifications] = useState(false);
  const [showStreaks, setShowStreaks] = useState(false);


const [streakData, setStreakData] = useState({
  current_streak: 0,
  longest_streak: 0,
  last_completed_date: null,
});


const [mlLoading, setMlLoading] = useState(false);
const [mlError, setMlError] = useState("");

const loadStreaks = async () => {
  const token = localStorage.getItem("token");

  if (!token) return;

  try {
    const response = await fetch(`${API_URL}/streaks`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load streaks");
    }

    const data = await response.json();

    setStreakData({
      current_streak: data.current_streak ?? 0,
      longest_streak: data.longest_streak ?? 0,
      last_completed_date: data.last_completed_date ?? null,
    });

    console.log("Streaks loaded successfully:", data);
  } catch (error) {
    console.error("Failed to load streaks:", error);
  }
};

const loadMLPrediction = async () => {
  console.log("ML FUNCTION CALLED");
  const token = localStorage.getItem("token");

  if (!token) return;

  setMlLoading(true);
  setMlError("");

  try {
    const response = await fetch(
      `${API_URL}/ml/predict-user-difficulty`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load ML prediction");
    }

    const data = await response.json();

    console.log("ML Prediction:", data);

    setMlPrediction(data);

  } catch (error) {
    console.error("ML prediction error:", error);
    setMlError("Unable to load AI difficulty recommendation");
  } finally {
    setMlLoading(false);
  }
};

const loadCoachHabitScores = async () => {
  console.log("COACH HABIT FUNCTION CALLED");
  const token = localStorage.getItem("token");

  if (!token) return;

  try {
    const response = await fetch(
      `${API_URL}/coach/habit-scores`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load coach analytics");
    }

    const data = await response.json();

    console.log("Coach Habit Scores:", data);

    setCoachHabitScores(data.users || []);

  } catch (error) {
    console.error("Coach analytics error:", error);
  }
};

const loadAdminUsers = async () => {
  const token = localStorage.getItem("token");

  if (!token) return;

  setAdminLoading(true);

  try {
    const response = await fetch(
      `${API_URL}/users`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load admin users");
    }

    const data = await response.json();

    console.log("Admin Users:", data);

    setAdminUsers(data);

  } catch (error) {
    console.error("Admin users error:", error);
  } finally {
    setAdminLoading(false);
  }
};

const loadAdminAnalytics = async () => {
  console.log("ADMIN ANALYTICS FUNCTION CALLED");
  const token = localStorage.getItem("token");

  if (!token) return;

  try {
    const response = await fetch(
      `${API_URL}/admin/analytics`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load admin analytics");
    }

    const data = await response.json();

    console.log("Admin Analytics:", data);

    setAdminAnalytics(data);

  } catch (error) {
    console.error("Admin analytics error:", error);
  }
};


const loadAdminChallengePerformance = async () => {
  const token = localStorage.getItem("token");

  if (!token) return;

  try {
    const response = await fetch(
      `${API_URL}/admin/reports/challenge-performance`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load challenge performance");
    }

    const data = await response.json();

    console.log("Admin Challenge Performance:", data);

    setAdminChallengePerformance(data);
  } catch (error) {
    console.error("Admin challenge performance error:", error);
  }
};


const loadNotifications = async () => {
  const token = localStorage.getItem("token");

  if (!token) return;

  setNotificationLoading(true);

  try {
    const response = await fetch(
      `${API_URL}/notifications`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load notifications");
    }

    const data = await response.json();

    setNotifications(data.notifications || []);

  } catch (error) {
    console.error("Notification loading error:", error);
  } finally {
    setNotificationLoading(false);
  }
};

const markNotificationAsRead = async (notificationId) => {
  const token = localStorage.getItem("token");

  if (!token) return;

  try {
    const response = await fetch(
      `${API_URL}/notifications/${notificationId}/read`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to mark notification as read");
    }

    setNotifications((previousNotifications) =>
      previousNotifications.map((item) =>
        item.notification_id === notificationId
          ? { ...item, is_read: true }
          : item
      )
    );

  } catch (error) {
    console.error("Notification read error:", error);
  }
};

const exportAnalyticsReport = () => {
  const doc = new jsPDF();

  const score = habitScore?.overall_score ?? 0;
  const wakeConsistency = habitScore?.wake_up_consistency ?? 0;
  const challengeSuccess = habitScore?.challenge_success ?? 0;
  const snoozeReduction = habitScore?.snooze_reduction ?? 0;
  const sleepAdherence = habitScore?.sleep_adherence ?? 0;

  const difficulty =
    mlPrediction?.ml_prediction?.difficulty ?? "N/A";

  const confidence =
    mlPrediction?.ml_prediction?.confidence ?? 0;

  const accuracy =
    mlPrediction?.input_data?.accuracy ?? 0;

  const snoozes =
    mlPrediction?.input_data?.snoozes ?? 0;

  doc.setFontSize(20);
  doc.text("Intelligent Cognitive Alarm", 20, 20);

  doc.setFontSize(12);
  doc.text("Analytics & Habit Report", 20, 30);

  doc.line(20, 35, 190, 35);

  doc.setFontSize(14);
  doc.text("Habit Performance", 20, 48);

  doc.setFontSize(11);

  const metrics = [
    ["Overall Score", `${score}/100`],
    ["Wake-up Consistency", `${wakeConsistency}%`],
    ["Challenge Success", `${challengeSuccess}%`],
    ["Snooze Reduction", `${snoozeReduction}%`],
    ["Sleep Adherence", `${sleepAdherence}%`],
  ];

  let y = 60;

  metrics.forEach(([label, value]) => {
    doc.text(`${label}:`, 25, y);
    doc.text(String(value), 110, y);
    y += 10;
  });

  y += 8;

  doc.setFontSize(14);
  doc.text("AI Adaptive Difficulty", 20, y);

  y += 12;

  doc.setFontSize(11);

  doc.text(`Recommended Difficulty: ${difficulty}`, 25, y);
  y += 10;

  doc.text(`AI Confidence: ${confidence}%`, 25, y);
  y += 10;

  doc.text(`Challenge Accuracy: ${accuracy}%`, 25, y);
  y += 10;

  doc.text(`Total Snoozes: ${snoozes}`, 25, y);
  y += 18;

  doc.setFontSize(14);
  doc.text("Activity Summary", 20, y);

  y += 12;

  doc.setFontSize(11);

  doc.text(
    `Behavioral Events Recorded: ${behavioralEvents.length}`,
    25,
    y
  );

  y += 10;

  doc.text(
    `Personalized Recommendations: ${recommendations.length}`,
    25,
    y
  );

  y += 20;

  doc.setFontSize(10);
  doc.text(
    `Generated on: ${new Date().toLocaleString()}`,
    20,
    y
  );

  doc.save("intelligent-cognitive-alarm-report.pdf");
};

const exportExcelReport = () => {
  const data = [
    {
      Metric: "Overall Score",
      Value: habitScore?.overall_score ?? 0,
    },
    {
      Metric: "Wake-up Consistency",
      Value: habitScore?.wake_up_consistency ?? 0,
    },
    {
      Metric: "Challenge Success",
      Value: habitScore?.challenge_success ?? 0,
    },
    {
      Metric: "Snooze Reduction",
      Value: habitScore?.snooze_reduction ?? 0,
    },
    {
      Metric: "Sleep Adherence",
      Value: habitScore?.sleep_adherence ?? 0,
    },
    {
      Metric: "AI Recommended Difficulty",
      Value: mlPrediction?.ml_prediction?.difficulty ?? "N/A",
    },
    {
      Metric: "AI Confidence",
      Value: mlPrediction?.ml_prediction?.confidence ?? 0,
    },
    {
      Metric: "Challenge Accuracy",
      Value: mlPrediction?.input_data?.accuracy ?? 0,
    },
    {
      Metric: "Total Snoozes",
      Value: mlPrediction?.input_data?.snoozes ?? 0,
    },
    {
      Metric: "Behavioral Events",
      Value: behavioralEvents.length,
    },
    {
      Metric: "Recommendations",
      Value: recommendations.length,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics");

  XLSX.writeFile(
    workbook,
    "intelligent-cognitive-alarm-report.xlsx"
  );
};


/* CHALLENGE LINKING DURING ALARM CREATION */
const [challenges, setChallenges] = useState([]);
const [selectedChallengeId, setSelectedChallengeId] = useState("");


/* ACTUAL RINGING ALARM */
const [ringingAlarm, setRingingAlarm] = useState(null);
const [ringingChallenge, setRingingChallenge] = useState(null);
const [ringingAnswer, setRingingAnswer] = useState("");
const [ringingMessage, setRingingMessage] = useState("");
const [ringingVerifying, setRingingVerifying] = useState(false);
const alarmAudioRef = useRef(null);
const ringingAlarmIdRef = useRef(null);


/* EDIT ALARM */

const [editingAlarmId, setEditingAlarmId] = useState(null);
const [editAlarmTime, setEditAlarmTime] = useState("");
const [editAlarmName, setEditAlarmName] = useState("");
const [editSelectedChallenge, setEditSelectedChallenge] = useState("");
const [editSelectedDifficulty, setEditSelectedDifficulty] = useState("");
const [editAlarmType, setEditAlarmType] = useState("Daily Alarm");

const [editRecurrenceDays, setEditRecurrenceDays] = useState([
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
]);

const [editAlarmDate, setEditAlarmDate] = useState("");

const [editAlarmTimeZone, setEditAlarmTimeZone] = useState("Asia/Kolkata");

const [editSmartWindowMinutes, setEditSmartWindowMinutes] = useState(30);

const [editSnoozeLimit, setEditSnoozeLimit] = useState(3);

  /* CHALLENGES */

  const [selectedChallenge, setSelectedChallenge] =
    useState("Logic Puzzles");

  const [selectedDifficulty, setSelectedDifficulty] =
    useState("Beginner");



const difficultyOptions = {
  "Math Problems": ["Easy", "Beginner", "Medium", "Hard", "Expert"],
  "Logic Puzzles": ["Easy", "Beginner", "Medium", "Hard", "Expert"],
  "Memory Challenge": ["Easy", "Beginner", "Medium", "Hard", "Expert"],
  "Word Games": ["Easy", "Beginner", "Medium", "Hard", "Expert"],
  "Pattern Recognition": ["Easy", "Beginner", "Medium", "Hard", "Expert"],
  "Riddles": ["Easy", "Beginner", "Medium", "Hard", "Expert"],
  "Quick Quiz": ["Easy", "Beginner", "Medium", "Hard", "Expert"],
};



  /* MILESTONE 2 - BACKEND COGNITIVE CHALLENGE */
  const [backendChallenge, setBackendChallenge] = useState(null);
  const [backendAnswer, setBackendAnswer] = useState("");
  const [backendResult, setBackendResult] = useState("");
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeSubmitting, setChallengeSubmitting] = useState(false);
  const [selectedAlarmId, setSelectedAlarmId] = useState("");
  const [alarmChallengeMessage, setAlarmChallengeMessage] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [typeAnalytics, setTypeAnalytics] = useState([]);

  /* MILESTONE 3 - HABIT TRACKING DASHBOARD */
  const [habitScore, setHabitScore] = useState(null);
  const [habitHistory, setHabitHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [adaptiveHistory, setAdaptiveHistory] = useState([]);
  const [behavioralEvents, setBehavioralEvents] = useState([]);
  const [m3Loading, setM3Loading] = useState(false);
  const [m3Message, setM3Message] = useState("");

  /* ---------------------------------------------------------
     REGISTER
  --------------------------------------------------------- */

  const handleRegister = async (e) => {
    e.preventDefault();

    setMessage("");

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Registration successful! Please login.");

        setShowRegister(false);
        setName("");
        setPassword("");
      } else {
        setMessage(data.detail || "Registration failed.");
      }
    } catch (error) {
      setMessage("Cannot connect to backend.");
    }
  };

  /* ---------------------------------------------------------
     LOGIN
  --------------------------------------------------------- */

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.access_token);
        const tokenPayload = JSON.parse(
  atob(data.access_token.split(".")[1])
);


setUserRole(tokenPayload.role);

if (tokenPayload.role === "admin") {
  setActivePage("admin");
} else if (tokenPayload.role === "wellness_coach") {
  setActivePage("coach");
  loadCoachHabitScores();
} else {
  setActivePage("dashboard");
}

setIsLoggedIn(true);

        setMessage("");

        setEmail("");
        setPassword("");
      } else {
        setMessage(data.detail || "Invalid email or password.");
      }
    } catch (error) {
      setMessage("Cannot connect to backend.");
    }
  };

  /* ---------------------------------------------------------
     LOGOUT
  --------------------------------------------------------- */

  const handleLogout = () => {
    localStorage.removeItem("token");

    setIsLoggedIn(false);
    setActivePage("dashboard");

    setMessage("");
  };

  /* ---------------------------------------------------------
     LOAD PROFILE
  --------------------------------------------------------- */

  const loadProfile = async () => {
    const userId = getUserIdFromToken();

    if (!userId) {
      setProfileMessage("User information not found.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/users/${userId}/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        if (data.wake_up_time) {
          setWakeUpTime(data.wake_up_time.slice(0, 5));
        }

        if (data.sleep_time) {
          setSleepTime(data.sleep_time.slice(0, 5));
        }

        if (data.preferred_challenge_type) {
          setPreferredChallengeType(
            data.preferred_challenge_type
          );
        }

        if (data.preferred_difficulty) {
          setPreferredDifficulty(
            data.preferred_difficulty
          );
        }
        if (data.sleep_duration_minutes != null) setSleepDurationMinutes(data.sleep_duration_minutes);
        if (data.time_zone) setTimeZone(data.time_zone);
        if (data.productivity_goals != null) setProductivityGoals(data.productivity_goals);
        if (data.habit_preferences != null) setHabitPreferences(data.habit_preferences);

        setProfileMessage("");
      } else {
        setProfileMessage("");
      }
    } catch (error) {
      setProfileMessage("Could not load profile.");
    }
  };

  /* ---------------------------------------------------------
     OPEN PROFILE
  --------------------------------------------------------- */

  const handleOpenProfile = () => {
    setActivePage("profile");
    loadProfile();
  };


  /* ---------------------------------------------------------
     SAVE PROFILE
  --------------------------------------------------------- */

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    const userId = getUserIdFromToken();

    if (!userId) {
      setProfileMessage("User information not found.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/users/${userId}/profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            wake_up_time: wakeUpTime,
            sleep_time: sleepTime,
            preferred_challenge_type:
              preferredChallengeType,
            preferred_difficulty:
              preferredDifficulty,
            sleep_duration_minutes: Number(sleepDurationMinutes),
            time_zone: timeZone,
            productivity_goals: productivityGoals,
            habit_preferences: habitPreferences,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setProfileMessage("Profile saved successfully!");
      } else {
        setProfileMessage(
          data.detail || "Could not save profile."
        );
      }
    } catch (error) {
      setProfileMessage("Cannot connect to backend.");
    }
  };


const createAlarm = async () => {
  console.log("CREATE ALARM BUTTON CLICKED");
  const token = localStorage.getItem("token");

  if (!token) {
    setAlarmMessage("Please login first.");
    return;
  }

  console.log("TOKEN CHECK PASSED");

console.log("Alarm details:", {
  alarmName,
  alarmTime,
  selectedChallenge,
  selectedDifficulty,
});

  if (!alarmTime || !alarmName) {
    setAlarmMessage("Please enter alarm name and time.");
    return;
  }

  if (!selectedChallenge || !selectedDifficulty) {
    setAlarmMessage("Please choose a challenge and difficulty.");
    return;
  }

  // Find a database question matching both selections
  const matchingChallenge = challenges.find(
    (c) =>
      c[1] === selectedChallenge &&
      c[2] === selectedDifficulty
  );

  if (!matchingChallenge) {
    setAlarmMessage(
      "No question found for this challenge and difficulty."
    );
    return;
  }

  try {
    const response = await fetch(`${API_URL}/alarms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: getUserIdFromToken(),
        alarm_time: alarmTime,
        alarm_name: alarmName,
        alarm_type: alarmType,
        recurrence_days:
          alarmType === "Custom Alarm"
            ? recurrenceDays.join(",")
            : "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
        alarm_date:
          alarmType === "Custom Alarm" && alarmDate
            ? alarmDate
            : null,
        time_zone: alarmTimeZone,
        smart_window_minutes: Number(smartWindowMinutes),
        snooze_limit: Number(snoozeLimit),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to create alarm");
    }

    // The backend returns the new alarm as a database row array
    const newAlarmId = Array.isArray(data)
      ? data[0]
      : data.alarm_id;

    if (!newAlarmId) {
      throw new Error("Alarm created, but its ID could not be found.");
    }

    // Link the selected cognitive challenge to this alarm
    const linkResponse = await fetch(
      `${API_URL}/alarm-challenges?alarm_id=${newAlarmId}&challenge_id=${matchingChallenge[0]}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!linkResponse.ok) {
      throw new Error(
        "Alarm was created, but linking the challenge failed."
      );
    }

const nextSettings = {
  ...alarmSettings,
  [newAlarmId]: {
    ...(alarmSettings[newAlarmId] || {}),
    challenge_type: selectedChallenge,
    difficulty: selectedDifficulty,
    snooze_limit: Number(snoozeLimit),
    snooze_count: 0,
  },
};

setAlarmSettings(nextSettings);
localStorage.setItem("alarmSettings", JSON.stringify(nextSettings));


    setAlarmMessage("Alarm created with your selected challenge! ⏰");

    // Clear form
    setAlarmName("");
    setAlarmTime("");
    setSelectedChallenge("");
    setSelectedDifficulty("");
    setSelectedChallengeId("");
    setAlarmType("Daily Alarm");
    setRecurrenceDays([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    setAlarmDate("");
    setAlarmTimeZone("Asia/Kolkata");
    setSmartWindowMinutes(30);
    setSnoozeLimit(3);

    await loadAlarms();
  } catch (error) {
    console.error("Create alarm error:", error);
    setAlarmMessage(error.message || "Failed to create alarm.");
  }
};


    /* ---------------------------------------------------------
     LOAD ALARMS
  --------------------------------------------------------- */




const loadAlarms = async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    setAlarmMessage("Please login first to load your alarms.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/alarms`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    let data;

    try {
      data = responseText ? JSON.parse(responseText) : [];
    } catch {
      throw new Error("The server returned an invalid response.");
    }

    if (!response.ok) {
      setAlarmMessage(
        data.detail || "Failed to load alarms."
      );
      return;
    }

    if (!Array.isArray(data)) {
      throw new Error("Unexpected alarm data received from the server.");
    }

    setAlarms(data);
    setAlarmMessage("");
    console.log("Saved alarms refreshed successfully:", data);
  } catch (error) {
    console.error("Load alarms error:", error);
    setAlarmMessage(
      error.message || "Cannot connect to backend."
    );
  }
};


  /* ---------------------------------------------------------
     ACTUAL BROWSER ALARM RINGING
  --------------------------------------------------------- */

  const stopAlarmSound = () => {
    const audioContext = alarmAudioRef.current;

    if (!audioContext) return;

    try {
      if (audioContext.__alarmTimer) {
        clearInterval(audioContext.__alarmTimer);
        audioContext.__alarmTimer = null;
      }

      if (audioContext.state !== "closed") {
        audioContext.close();
      }
    } catch (error) {
      // Ignore audio cleanup errors.
    }

    alarmAudioRef.current = null;
  };

  const startAlarmSound = async () => {
    stopAlarmSound();

    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const audioContext = new AudioContextClass();

      if (audioContext.state === "suspended") {
        try {
          await audioContext.resume();
        } catch (error) {
          // Browser may require a previous user interaction.
        }
      }

      const beep = () => {
        if (audioContext.state === "closed") return;

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(
          880,
          audioContext.currentTime
        );

        gain.gain.setValueAtTime(
          0.0001,
          audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
          0.25,
          audioContext.currentTime + 0.03
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          audioContext.currentTime + 0.55
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.6);
      };

      beep();
      audioContext.__alarmTimer = setInterval(beep, 900);
      alarmAudioRef.current = audioContext;
    } catch (error) {
      console.error("Could not start alarm sound:", error);
    }
  };

  const getTodayShortName = () => {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
      new Date().getDay()
    ];
  };

  const shouldRingAlarm = (alarm) => {
    const alarmId = alarm[0];
    const alarmTimeValue = alarm[2];
    const isActive = alarm[4];

    if (!isActive || !alarmTimeValue) {
      return false;
    }

    const settings = alarmSettings[alarmId] || {};
    const type = settings.alarm_type || "Daily Alarm";

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentDay = getTodayShortName();
    const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const alarmHHMM = String(alarmTimeValue).slice(0, 5);

    if (currentHHMM !== alarmHHMM) {
      return false;
    }

    if (type === "Weekday Alarm") {
      return ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(currentDay);
    }

    if (type === "Weekend Alarm") {
      return ["Sat", "Sun"].includes(currentDay);
    }

    if (type === "One-Time Alarm") {
      return !settings.alarm_date || settings.alarm_date === today;
    }

    if (type === "Smart Adaptive Alarm") {
      return true;
    }

    const selectedDays = Array.isArray(settings.recurrence_days)
      ? settings.recurrence_days
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return selectedDays.includes(currentDay);
  };

  const recordBehavioralEvent = async (
    eventType,
    alarmId = null,
    metadata = {}
  ) => {
    const token = localStorage.getItem("token");

    if (!token) return;

    try {
      await fetch(`${API_URL}/behavioral-events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_type: eventType,
          alarm_id: alarmId ? Number(alarmId) : null,
          metadata,
        }),
      });
    } catch (error) {
      console.error("Behavioral event error:", error);
    }
  };


  const triggerActualAlarm = async (alarm) => {
    const alarmId = alarm[0];

    if (ringingAlarmIdRef.current === alarmId) {
      return;
    }

    ringingAlarmIdRef.current = alarmId;

    await recordBehavioralEvent("alarm_triggered", alarmId, {
      alarm_name: alarm[3],
    });

    setRingingAlarm(alarm);
    setRingingAnswer("");
    setRingingMessage("Alarm is ringing. Solve the challenge to stop it.");
    setRingingChallenge(null);

    await startAlarmSound();

    const token = localStorage.getItem("token");

    if (!token) return;

    try {
      const settings = alarmSettings[alarmId] || {};
      const challengeType = settings.challenge_type || "Logic Puzzles";
      const difficulty = settings.difficulty || "Beginner";

      // Generate a FRESH challenge only when the alarm rings.
      const response = await fetch(
  `${API_URL}/generate-adaptive-challenge`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      challenge_type: challengeType,
      previous_difficulty: difficulty,
    }),
  }
);

      const data = await response.json();

      if (response.ok) {
        const challenge = Array.isArray(data)
          ? {
              challenge_id: data[0],
              challenge_type: data[1],
              difficulty: data[2],
              question: data[3],
              correct_answer: data[4],
            }
          : data;

        setRingingChallenge(challenge);
        setRingingMessage(
          `Solve this ${challengeType} challenge to stop the alarm.`
        );
      } else {
        setRingingMessage(
          data.detail || "Could not generate the wake-up challenge."
        );
      }
    } catch (error) {
      setRingingMessage(
        "Could not generate the wake-up challenge. The alarm will keep ringing."
      );
    }
  };

  const dismissActualAlarm = () => {
    stopAlarmSound();
    setRingingAlarm(null);
    setRingingChallenge(null);
    setRingingAnswer("");
    setRingingMessage("");
    setRingingVerifying(false);
    ringingAlarmIdRef.current = null;
  };

  const verifyRingingAlarm = async () => {
    if (!ringingAlarm) return;

    if (!ringingChallenge) {
      dismissActualAlarm();
      return;
    }

    if (!ringingAnswer.trim()) {
      setRingingMessage("Please enter your answer.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setRingingMessage("Please login again.");
      return;
    }

    setRingingVerifying(true);
    setRingingMessage("");

    try {
      const response = await fetch(`${API_URL}/verify-wakeup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          alarm_id: Number(ringingAlarm[0]),
          challenge_id: Number(ringingChallenge.challenge_id),
          user_answer: ringingAnswer,
        }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        await recordBehavioralEvent("challenge_completed", ringingAlarm[0], {
          challenge_id: ringingChallenge.challenge_id,
      });
        setRingingMessage("Wake-up verified! Alarm stopped.");
        setTimeout(() => {
          dismissActualAlarm();
        }, 500);
      } else {
        await recordBehavioralEvent("challenge_failed", ringingAlarm[0], {
          challenge_id: ringingChallenge.challenge_id,
        });
        setRingingMessage(
          data.detail ||
            "That answer is not correct. The alarm will keep ringing."
        );
      }
    } catch (error) {
      setRingingMessage(
        "Cannot connect to the backend. The alarm will keep ringing."
      );
    } finally {
      setRingingVerifying(false);
    }
  };

  /* Check active alarms every second. */
  useEffect(() => {
    if (!isLoggedIn) return;

    const checkAlarms = () => {
      if (ringingAlarmIdRef.current !== null) return;

      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      for (const alarm of alarms) {
        if (!shouldRingAlarm(alarm)) continue;

        const key = `alarm-rung-${alarm[0]}-${today}-${currentHHMM}`;
        if (sessionStorage.getItem(key)) continue;

        sessionStorage.setItem(key, "true");
        triggerActualAlarm(alarm);
        break;
      }
    };

    checkAlarms();

    const timer = setInterval(checkAlarms, 1000);

    return () => clearInterval(timer);
  }, [isLoggedIn, alarms, alarmSettings]);

  useEffect(() => {
    return () => {
      stopAlarmSound();
    };
  }, []);


  /* ---------------------------------------------------------
     CREATE ALARM
  --------------------------------------------------------- */

  const handleCreateAlarm = async () => {
    const token = localStorage.getItem("token");
    const userId = getUserIdFromToken();

    if (!token || !userId) {
      setAlarmMessage("Please login first.");
      return;
    }

    if (!alarmTime) {
      setAlarmMessage("Please select an alarm time.");
      return;
    }

    if (!alarmName.trim()) {
      setAlarmMessage("Please enter an alarm name.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/alarms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          alarm_time: alarmTime,
          alarm_name: alarmName,
          alarm_type: alarmType,
          recurrence_days: recurrenceDays.join(","),
          alarm_date: alarmDate || null,
          time_zone: alarmTimeZone,
          smart_window_minutes: Number(smartWindowMinutes),
          snooze_limit: Number(snoozeLimit),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlarmMessage("Alarm created successfully!");

        const createdAlarmId = data.alarm_id || data.id || (Array.isArray(data) ? data[0] : null);
        if (createdAlarmId) {
          const nextSettings = {
            ...alarmSettings,
            [createdAlarmId]: {
              alarm_type: alarmType,
              recurrence_days: recurrenceDays,
              alarm_date: alarmDate,
              time_zone: alarmTimeZone,
              smart_window_minutes: Number(smartWindowMinutes),
              snooze_limit: Number(snoozeLimit),
              snooze_count: 0,
              challenge_type: selectedChallenge,
              difficulty: selectedDifficulty,
            },
          };
          setAlarmSettings(nextSettings);
          localStorage.setItem("alarmSettings", JSON.stringify(nextSettings));
        }

        setAlarmTime("");
        setAlarmName("");
        setAlarmDate("");
        setAlarmType("Daily Alarm");
        setRecurrenceDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
        setSmartWindowMinutes(30);
        setSnoozeLimit(3);
        await loadAlarms();
      } else {
        setAlarmMessage(
          data.detail || "Failed to create alarm."
        );
      }
    } catch (error) {
      setAlarmMessage("Cannot connect to backend.");
    }
  };


const handleSnoozeAlarm = async (alarmId) => {
  const token = localStorage.getItem("token");

  if (!token) {
    setAlarmMessage("Please login first.");
    return;
  }

  const current = alarmSettings[alarmId] || {};
  const limit = Number(current.snooze_limit ?? 3);
  const count = Number(current.snooze_count ?? 0);

  if (count >= limit) {
    setAlarmMessage(`Snooze limit reached (${limit}).`);
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/alarms/${alarmId}/snooze`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await response.json();

    if (!response.ok || data.snoozed === false) {
      setAlarmMessage(data.detail || data.message || "Could not snooze alarm.");
      return;
    }

    const nextCount = Number(data.snooze_count ?? count + 1);

    const nextSettings = {
      ...alarmSettings,
      [alarmId]: {
        ...current,
        snooze_limit: limit,
        snooze_count: nextCount,
      },
    };

    setAlarmSettings(nextSettings);
    localStorage.setItem("alarmSettings", JSON.stringify(nextSettings));

    await recordBehavioralEvent("snooze", alarmId, {
      snooze_count: nextCount,
      snooze_limit: limit,
    });

    // Stop the current ringing and schedule a restart in 5 minutes.
    if (ringingAlarm && Number(ringingAlarm[0]) === Number(alarmId)) {
      stopAlarmSound();
      setRingingAlarm(null);
      setRingingChallenge(null);
      setRingingAnswer("");
      setRingingMessage("");
      ringingAlarmIdRef.current = null;
    }

    if (snoozeTimerRef.current) {
      clearTimeout(snoozeTimerRef.current);
    }

    const alarmToResume = alarms.find(
      (alarm) => Number(alarm[0]) === Number(alarmId)
    );

    if (alarmToResume) {
      snoozeTimerRef.current = setTimeout(() => {
        snoozeTimerRef.current = null;
        triggerActualAlarm(alarmToResume);
      }, 3 * 60 * 1000);
    }

    setAlarmMessage("Alarm snoozed for 5 minutes.");
  } catch (error) {
    setAlarmMessage("Cannot connect to backend.");
  }
};


  const handleDeleteAlarm = async (alarmId) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setAlarmMessage("Please login first.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this alarm?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/alarms/${alarmId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setAlarmMessage("Alarm deleted successfully!");
        await loadAlarms();
      } else {
        setAlarmMessage(
          data.detail || "Failed to delete alarm."
        );
      }
    } catch (error) {
      setAlarmMessage("Cannot connect to backend.");
    }
  };

  const handleEditAlarm = (alarm) => {
  setEditingAlarmId(alarm[0]);

  setEditAlarmTime(alarm[2] || "");
  setEditAlarmName(alarm[3] || "");

  setEditAlartWindowMinutes(
    alarm[9] ?? 30
  );

  setEditSnoozeLimit(
    alarm[10] ?? 3
  );
};

const handleUpdateAlarm = async () => {
  const token = localStorage.getItem("token");
  const userId = getUserIdFromToken();

  if (!token) {
    setAlarmMessage("Please login first.");
    return;
  }

  if (!editAlarmTime) {
    setAlarmMessage("Please select an alarm time.");
    return;
  }

  if (!editAlarmName.trim()) {
    setAlarmMessage("Please enter an alarm name.");
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/alarms/${editingAlarmId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,

          alarm_time: editAlarmTime,
          alarm_name: editAlarmName,

          alarm_type: editAlarmType,

          recurrence_days:
            editAlarmType === "Custom Alarm"
              ? editRecurrenceDays.join(",")
              : "Mon,Tue,Wed,Thu,Fri,Sat,Sun",

          alarm_date:
            editAlarmType === "Custom Alarm" && editAlarmDate
              ? editAlarmDate
              : null,

          time_zone: editAlarmTimeZone,

          smart_window_minutes:
            Number(editSmartWindowMinutes),

          snooze_limit:
            Number(editSnoozeLimit),
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      setAlarmMessage("Alarm updated successfully! ✅");

      setEditingAlarmId(null);
      setEditAlarmTime("");
      setEditAlarmName("");

      setEditAlarmType("Daily Alarm");

      setEditRecurrenceDays([
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun",
      ]);

      setEditAlarmDate("");
      setEditAlarmTimeZone("Asia/Kolkata");
      setEditSmartWindowMinutes(30);
      setEditSnoozeLimit(3);

      await loadAlarms();
    } else {
      setAlarmMessage(
        data.detail || "Failed to update alarm."
      );
    }
  } catch (error) {
    console.error("Update alarm error:", error);
    setAlarmMessage("Cannot connect to backend.");
  }
};
const handleCancelEdit = () => {
  setEditingAlarmId(null);
  setEditAlarmTime("");
  setEditAlarmName("");
  setAlarmMessage("");
};

  /* ---------------------------------------------------------
     MILESTONE 2 - BACKEND COGNITIVE CHALLENGE FUNCTIONS
  --------------------------------------------------------- */
  const handleGenerateBackendChallenge = async () => {
    const token = localStorage.getItem("token");
    if (!token) { setBackendResult("Please login first."); return; }
    setChallengeLoading(true); setBackendResult(""); setBackendAnswer("");
    try {
      const response = await fetch(`${API_URL}/generate-challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ challenge_type: selectedChallenge, difficulty: selectedDifficulty }),
      });
      const data = await response.json();
      if (!response.ok) { setBackendResult(data.detail || "Could not generate challenge."); return; }
      const challenge = Array.isArray(data) ? { challenge_id: data[0], challenge_type: data[1], difficulty: data[2], question: data[3], correct_answer: data[4] } : data;
      setBackendChallenge(challenge);
      setBackendResult("New challenge generated successfully!");
    } catch (error) { setBackendResult("Cannot connect to backend."); }
    finally { setChallengeLoading(false); }
  };

  const handleSubmitBackendAnswer = async () => {
    const token = localStorage.getItem("token");
    if (!token || !backendChallenge) { setBackendResult("Generate a challenge first."); return; }
    if (!backendAnswer.trim()) { setBackendResult("Please enter your answer."); return; }
    setChallengeSubmitting(true); setBackendResult("");
    try {
      const response = await fetch(`${API_URL}/submit-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ challenge_id: backendChallenge.challenge_id, user_answer: backendAnswer }),
      });
      const data = await response.json();
      if (response.ok) {
        setBackendResult(data.correct ? "Correct answer! 🎉" : "Incorrect answer. Try again.");
        await loadChallengeAnalytics();
      } else setBackendResult(data.detail || "Could not submit answer.");
    } catch (error) { setBackendResult("Cannot connect to backend."); }
    finally { setChallengeSubmitting(false); }
  };

  const handleLoadAlarmChallenge = async (alarmId) => {
    const token = localStorage.getItem("token");
    if (!token || !alarmId) return;
    setSelectedAlarmId(String(alarmId)); setAlarmChallengeMessage(""); setBackendResult(""); setBackendAnswer("");
    try {
      const response = await fetch(`${API_URL}/alarms/${alarmId}/challenge`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) { setBackendChallenge(null); setAlarmChallengeMessage(data.detail || "No challenge linked to this alarm."); return; }
      const challenge = Array.isArray(data) ? { challenge_id: data[0], challenge_type: data[1], difficulty: data[2], question: data[3], correct_answer: data[4] } : data;
      setBackendChallenge(challenge); setSelectedChallenge(challenge.challenge_type); setSelectedDifficulty(challenge.difficulty);
      setAlarmChallengeMessage("Challenge loaded from this alarm.");
    } catch (error) { setAlarmChallengeMessage("Cannot connect to backend."); }
  };

  const handleLinkChallengeToAlarm = async () => {
    const token = localStorage.getItem("token");
    if (!token || !backendChallenge) { setAlarmChallengeMessage("Generate a challenge first."); return; }
    if (!selectedAlarmId) { setAlarmChallengeMessage("Select an alarm first."); return; }
    try {
      const response = await fetch(`${API_URL}/alarm-challenges?alarm_id=${selectedAlarmId}&challenge_id=${backendChallenge.challenge_id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (response.ok) setAlarmChallengeMessage("Challenge linked to alarm successfully! 🎉");
      else setAlarmChallengeMessage(data.detail || "Could not link challenge to alarm.");
    } catch (error) { setAlarmChallengeMessage("Cannot connect to backend."); }
  };

  const handleVerifyWakeUp = async () => {
    const token = localStorage.getItem("token");
    if (!token || !backendChallenge || !selectedAlarmId) { setBackendResult("Select an alarm with a linked challenge first."); return; }
    if (!backendAnswer.trim()) { setBackendResult("Please enter your answer."); return; }
    setChallengeSubmitting(true); setBackendResult("");
    try {
      const response = await fetch(`${API_URL}/verify-wakeup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ alarm_id: Number(selectedAlarmId), challenge_id: backendChallenge.challenge_id, user_answer: backendAnswer }),
      });
      const data = await response.json();
      if (response.ok) {
        setBackendResult(data.verified ? "Wake-up verified! Alarm can be dismissed. 🎉" : "Answer is not correct. Please try again.");
        await loadChallengeAnalytics();
      } else setBackendResult(data.detail || "Wake-up verification failed.");
    } catch (error) { setBackendResult("Cannot connect to backend."); }
    finally { setChallengeSubmitting(false); }
  };

  const loadM3Dashboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setM3Loading(true);
    setM3Message("");

    try {
      const [habitResponse, recommendationsResponse, adaptiveResponse, eventsResponse] = await Promise.all([
        fetch(`${API_URL}/habit-score`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/recommendations`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/adaptive-difficulty`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/behavioral-events`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const habitData = await habitResponse.json();
      const recommendationsData = await recommendationsResponse.json();
      const adaptiveData = await adaptiveResponse.json();
      const eventsData = await eventsResponse.json();

      if (habitResponse.ok) {
        const history = habitData.history || [];
        setHabitHistory(history);
        setHabitScore(history.length > 0 ? history[0] : null);
      }

      if (recommendationsResponse.ok) {
        setRecommendations(recommendationsData.recommendations || []);
      }

      if (adaptiveResponse.ok) {
        setAdaptiveHistory(adaptiveData.history || adaptiveData.records || []);
      }

      if (eventsResponse.ok) {
        setBehavioralEvents(eventsData.events || []);
      }
    } catch (error) {
      setM3Message("Could not load M3 dashboard data.");
    } finally {
      setM3Loading(false);
    }
  };

  const handleCompleteRecommendation = async (recommendationId) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/recommendations/${recommendationId}/complete`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await loadM3Dashboard();
      }
    } catch (error) {
      setM3Message("Could not update recommendation.");
    }
  };


  const loadChallengeAnalytics = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const [overallResponse, typeResponse] = await Promise.all([
        fetch(`${API_URL}/challenge-analytics`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/challenge-analytics/by-type`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const overallData = await overallResponse.json();
      const typeData = await typeResponse.json();
      if (overallResponse.ok) setAnalytics(overallData);
      if (typeResponse.ok) setTypeAnalytics(typeData.analytics || []);
    } catch (error) {}
  };

const loadChallenges = async () => {
  const token = localStorage.getItem("token");

  try {
    const response = await fetch(`${API_URL}/challenges`, {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    });

    if (!response.ok) {
      throw new Error("Could not load challenges");
    }

    const data = await response.json();
    setChallenges(data);
  } catch (error) {
    console.error("Load challenges error:", error);
  }
};

  useEffect(() => {
  if (isLoggedIn) {
    loadAlarms();
    loadChallenges(); // Added to load challenge options
    loadChallengeAnalytics();
    loadM3Dashboard();
    loadMLPrediction();
    loadNotifications();
    loadStreaks();
  }
}, [isLoggedIn]);


  /* =========================================================
     LOGIN / REGISTER SCREEN
  ========================================================= */
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center p-6">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-10">

            {/* App Header */}
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl">
                ⏰
              </div>

              <h1 className="mt-4 text-3xl font-bold text-white">
                Intelligent Cognitive Alarm
              </h1>

              <p className="mt-2 text-slate-400">
                Train your brain before you start your day
              </p>
            </div>

            {selectedPortal === null && !showRegister ? (
              <>
                <h2 className="mt-8 text-center text-2xl font-bold text-white">
                  Welcome Back
                </h2>

                <p className="mt-2 text-center text-slate-400">
                  Choose your login portal
                </p>

                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">

                  {/* User Portal */}
                  <button
                    type="button"
                    onClick={() => setSelectedPortal("user")}
                    className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-center transition hover:-translate-y-1 hover:border-blue-500 hover:bg-slate-800/80"
                  >
                    <div className="text-4xl">👤</div>
                    <h3 className="mt-3 font-bold text-white">User</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Personal dashboard
                    </p>
                    <span className="mt-4 inline-block text-sm font-semibold text-blue-400">
                      Login →
                    </span>
                  </button>

                  {/* Wellness Coach Portal */}
                  <button
                    type="button"
                    onClick={() => setSelectedPortal("wellness_coach")}
                    className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-center transition hover:-translate-y-1 hover:border-teal-500 hover:bg-slate-800/80"
                  >
                    <div className="text-4xl">🧑‍🏫</div>
                    <h3 className="mt-3 font-bold text-white">
                      Wellness Coach
                    </h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Wellness monitoring
                    </p>
                    <span className="mt-4 inline-block text-sm font-semibold text-teal-400">
                      Login →
                    </span>
                  </button>

                  {/* Admin Portal */}
                  <button
                    type="button"
                    onClick={() => setSelectedPortal("admin")}
                    className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-center transition hover:-translate-y-1 hover:border-purple-500 hover:bg-slate-800/80"
                  >
                    <div className="text-4xl">🛡️</div>
                    <h3 className="mt-3 font-bold text-white">Admin</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Platform management
                    </p>
                    <span className="mt-4 inline-block text-sm font-semibold text-purple-400">
                      Login →
                    </span>
                  </button>

                </div>
              </>
            ) : !showRegister ? (
              <>
                <h2 className="mb-6 mt-8 text-2xl font-bold text-white">
                  {selectedPortal === "user"
                    ? "User Login"
                    : selectedPortal === "wellness_coach"
                    ? "Wellness Coach Login"
                    : selectedPortal === "admin"
                    ? "Admin Login"
                    : "Login"}
                </h2>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPortal(null);
                    setMessage("");
                    setEmail("");
                    setPassword("");
                  }}
                  className="mb-5 text-sm text-blue-400 hover:text-blue-300"
                >
                  ← Back to portal selection
                </button>

                <form onSubmit={handleLogin}>
                  <label className="text-sm text-slate-300">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="mt-2 mb-5 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />

                  <label className="text-sm text-slate-300">
                    Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="mt-2 mb-6 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Login
                  </button>
                </form>

                {message && (
                  <p className="mt-4 text-center text-red-400">
                    {message}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowRegister(true);
                    setMessage("");
                  }}
                  className="mt-6 w-full text-blue-400 hover:text-blue-300"
                >
                  Don&apos;t have an account? Register
                </button>
              </>
            ) : (
              <>
                <h2 className="mb-6 mt-8 text-2xl font-bold text-white">
                  Create Account
                </h2>

                <form onSubmit={handleRegister}>
                  <label className="text-sm text-slate-300">
                    Name
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                    className="mt-2 mb-5 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />

                  <label className="text-sm text-slate-300">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="mt-2 mb-5 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />

                  <label className="text-sm text-slate-300">
                    Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    className="mt-2 mb-6 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Register
                  </button>
                </form>

                {message && (
                  <p className="mt-4 text-center text-green-400">
                    {message}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowRegister(false);
                    setMessage("");
                  }}
                  className="mt-6 w-full text-blue-400 hover:text-blue-300"
                >
                  Already have an account? Login
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN DASHBOARD
  ========================================================= */

  return (
    <>
      {ringingAlarm && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-slate-900 border-2 border-red-500 rounded-3xl shadow-2xl p-8">
            <div className="text-center">
              <div className="text-7xl animate-pulse mb-4">⏰</div>

              <p className="text-red-400 font-bold uppercase tracking-widest text-sm">
                Alarm Ringing
              </p>

              <h2 className="text-4xl font-bold mt-2">
                {ringingAlarm[3]}
              </h2>

              <p className="text-5xl font-bold text-blue-400 mt-3">
                {formatAlarmTime(ringingAlarm[2])}
              </p>

              <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
                <p className="text-slate-300">
                  {ringingMessage}
                </p>
              </div>

              {ringingChallenge && (
                <div className="mt-6 text-left">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold">
                      🧠 Wake-Up Challenge
                    </h3>

                    <span className="text-xs px-3 py-1 rounded-full bg-blue-600/20 text-blue-300">
                      {ringingChallenge.difficulty}
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-800 border border-slate-700">
                    <p className="text-lg font-semibold">
                      {ringingChallenge.question}
                    </p>

                    <input
                      value={ringingAnswer}
                      onChange={(e) => setRingingAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          verifyRingingAlarm();
                        }
                      }}
                      placeholder="Enter your answer"
                      className="w-full mt-5 px-4 py-4 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                      autoFocus
                    />

                    <button
                      onClick={verifyRingingAlarm}
                      disabled={ringingVerifying}
                      className="w-full mt-4 py-4 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 font-bold"
                    >
                      {ringingVerifying
                        ? "Verifying..."
                        : "✓ Verify & Stop Alarm"}
                    </button>

                    <button
  onClick={async () => {
    const alarmId = ringingAlarm[0];
    await handleSnoozeAlarm(alarmId);
    dismissActualAlarm();
  }}
  className="w-full mt-3 py-4 rounded-xl bg-yellow-600 hover:bg-yellow-700 font-bold"
>
  💤 Snooze Alarm
</button>
                  </div>
                </div>
              )}

              {!ringingChallenge && (
                <button
                  onClick={dismissActualAlarm}
                  className="w-full mt-6 py-4 rounded-xl bg-red-600 hover:bg-red-700 font-bold"
                >
                  🔕 Stop Alarm
                </button>
              )}

              {ringingChallenge && (
                <button
                  onClick={() => {
                    setRingingMessage(
                      "You must solve the challenge correctly to stop this alarm."
                    );
                  }}
                  className="mt-5 text-slate-400 hover:text-white text-sm"
                >
                  Why is the alarm still ringing?
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      <div
        className={`min-h-screen ${
          appearance === "Light"
            ? "bg-gray-100 text-gray-900"
            : "bg-slate-950 text-white"
        }`}
      >

      {/* LEFT SIDEBAR */}

      <aside
  className={`fixed left-0 top-0 bottom-0 z-40 w-64 border-r flex flex-col ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>

<div
  className={`px-6 py-6 border-b ${
    appearance === "Light" ? "border-gray-200" : "border-slate-800"
  }`}
>
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xl">
      🧠
    </div>

    <div>
      <h2
        className={`font-bold text-lg ${
          appearance === "Light" ? "text-gray-900" : "text-white"
        }`}
      >
        CognitiveAlarm
      </h2>

      <p
        className={`text-xs ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}
      >
        Smart wake-up platform
      </p>
    </div>
  </div>
</div>

<nav className="flex-1 px-4 py-6 space-y-2">



{[
  ...(userRole === "admin"
    ? [
        ["admin", "🛡️", "Admin Dashboard"],
        ["settings", "⚙️", "Settings"],
      ]
    : userRole === "wellness_coach"
    ? [
        ["coach", "🧑‍🏫", "Wellness Coach"],
        ["settings", "⚙️", "Settings"],
      ]
    : [
        ["dashboard", "🏠", "Dashboard"],
        ["executive", "📈", "Executive Dashboard"],
        ["alarms", "⏰", "Alarms"],
        ["challenges", "🧠", "Challenges"],
        ["analytics", "📊", "Analytics & Behavior"],
        ["habits", "🎯", "Habit Insights"],
        ["recommendations", "💡", "Recommendations"],
        ["profile", "👤", "Profile & Habits"],
        ["settings", "⚙️", "Settings"],
      ]),
].map(([page, icon, label]) => (

            <button
              key={page}
              onClick={() => {
  setActivePage(page);

  if (page === "profile") {
    loadProfile();
  }

  if (page === "coach") {
    loadCoachHabitScores();
  }

if (page === "admin") {
  loadAdminUsers();
  loadAdminAnalytics();
  loadAdminChallengePerformance();
}

}}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${
  activePage === page
    ? "bg-blue-600 text-white font-semibold"
    : appearance === "Light"
      ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      : "text-slate-300 hover:bg-slate-800 hover:text-white"
}`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="px-4 py-5 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-left"><span>🚪</span><span>Logout</span></button>
        </div>
      </aside>

      <div className="ml-64">

      {/* HEADER */}

      <header
  id="dashboard-top"
  className={`border-b ${
    appearance === "Light"
      ? "border-gray-200 bg-white text-gray-900"
      : "border-slate-800 bg-slate-900 text-white"
  }`}
>

        <div className="relative max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">

          <div>
            <h1 className="text-2xl font-bold">
              {activePage === "dashboard" && "🏠 Dashboard"}
              {activePage === "alarms" && "⏰ Alarms"}
              {activePage === "challenges" && "🧠 Cognitive Challenges"}
              {activePage === "analytics" && "📊 Analytics"}
              {activePage === "habits" && "🎯 Habit Insights"}
              {activePage === "recommendations" && "💡 Recommendations"}
              {activePage === "admin" && "🛡️ Admin Dashboard"}
              {activePage === "profile" && "👤 Profile"}
              {activePage === "settings" && "⚙️ Settings"}
            </h1>

            <p className="text-slate-400 text-sm">
              {activePage === "dashboard" && "Overview of your intelligent wake-up system"}
              {activePage === "alarms" && "Create and manage your wake-up alarms"}
              {activePage === "challenges" && "Train your brain before starting your day"}
              {activePage === "analytics" && "Track cognitive performance and behavioral patterns"}
              {activePage === "habits" && "Track habits, adaptive difficulty and personalized recommendations"}
              {activePage === "recommendations" && "Personalized suggestions based on your behavior and habits"}
              {activePage === "profile" && "Manage your sleep and cognitive preferences"}
              {activePage === "settings" && "Customize your alarm and app preferences"}
            </p>
          </div>

          <div className="flex items-center gap-4">

            <button
  onClick={() => setShowNotifications(!showNotifications)}
  className="relative text-2xl"
  title="Notifications"
>
  🔔

  {notifications.filter((item) => !item.is_read).length > 0 && (
    <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">
      {notifications.filter((item) => !item.is_read).length}
    </span>
  )}
</button>


<button
  onClick={() => setShowStreaks(!showStreaks)}
  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900 hover:bg-gray-100"
      : "bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
  }`}
  title="View your streaks"
>
  <span className="text-xl">🔥</span>
  <span className="font-semibold">0</span>
</button>


{showNotifications && (
  <div
    className={`absolute right-32 top-16 w-96 border rounded-2xl shadow-2xl z-50 overflow-hidden ${
      appearance === "Light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-slate-900 border-slate-700 text-white"
    }`}
  >
    <div
      className={`px-5 py-4 border-b flex items-center justify-between ${
        appearance === "Light" ? "border-gray-200" : "border-slate-700"
      }`}
    >
      <h3 className="font-bold text-lg">
        🔔 Notifications
      </h3>

      <span
        className={`text-sm ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}
      >
        {notifications.filter((item) => !item.is_read).length} unread
      </span>
    </div>

    <div className="max-h-96 overflow-y-auto">
      {notificationLoading ? (
        <p
          className={`p-5 text-center ${
            appearance === "Light" ? "text-gray-600" : "text-slate-400"
          }`}
        >
          Loading notifications...
        </p>
      ) : notifications.length === 0 ? (
        <p
          className={`p-5 text-center ${
            appearance === "Light" ? "text-gray-600" : "text-slate-400"
          }`}
        >
          No notifications yet.
        </p>
      ) : (
        notifications.map((item) => (
          <div
            key={item.notification_id}
            onClick={() => markNotificationAsRead(item.notification_id)}
            className={`px-5 py-4 border-b cursor-pointer transition ${
              appearance === "Light"
                ? `border-gray-100 hover:bg-gray-100 ${
                    item.is_read ? "bg-white" : "bg-blue-50"
                  }`
                : `border-slate-800 hover:bg-slate-800 ${
                    item.is_read ? "bg-slate-900" : "bg-blue-500/10"
                  }`
            }`}
>


<div className="flex items-start justify-between gap-3">
  <div className="flex-1">
    <p
      className={`font-semibold ${
        appearance === "Light" ? "text-gray-900" : "text-white"
      }`}
    >
      {item.title}
    </p>

    <p
      className={`text-sm mt-1 ${
        appearance === "Light" ? "text-gray-600" : "text-slate-400"
      }`}
    >
      {item.message}
    </p>

    <p
      className={`text-xs mt-2 ${
        appearance === "Light" ? "text-gray-500" : "text-slate-500"
      }`}
    >
      {new Date(item.created_at).toLocaleString()}
    </p>
  </div>

  {!item.is_read && (
    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-2"></span>
  )}
</div>


          </div>
        ))

      )}

    </div>

  </div>
)}


{showStreaks && (
  <div
    className={`absolute right-32 top-16 w-80 border rounded-2xl shadow-2xl z-50 p-5 ${
      appearance === "Light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-slate-900 border-slate-700 text-white"
    }`}
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold">🔥 Your Streaks</h3>

      <button
        onClick={() => setShowStreaks(false)}
        className={
          appearance === "Light"
            ? "text-gray-500 hover:text-gray-900"
            : "text-slate-400 hover:text-white"
        }
        aria-label="Close streaks"
      >
        ✕
      </button>
    </div>

    <div
      className={`rounded-xl p-4 text-center ${
        appearance === "Light" ? "bg-orange-50" : "bg-orange-500/10"
      }`}
    >
      <p className="text-4xl">🔥</p>


<p className="text-3xl font-bold mt-2">
  {streakData.current_streak}{" "}
  {streakData.current_streak === 1 ? "day" : "days"}
</p>


      <p
        className={`text-sm mt-1 ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}
      >
        Current streak
      </p>
    </div>

    <div
      className={`mt-4 rounded-xl border p-4 ${
        appearance === "Light" ? "border-gray-200" : "border-slate-700"
      }`}
    >

{streakData.longest_streak}{" "}
{streakData.longest_streak === 1 ? "day" : "days"}
{streakData.longest_streak === 0
  ? " — Start your first streak!"
  : " — Your personal best!"}

    </div>

    <p
      className={`text-xs mt-4 ${
        appearance === "Light" ? "text-gray-500" : "text-slate-400"
      }`}
    >
      Complete your wake-up routine consistently to build your streak.
    </p>
  </div>
)}


            <button
              onClick={handleOpenProfile}
              className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold hover:bg-blue-700"
              title="Profile"
            >
              J
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold"
            >
              Logout
            </button>

          </div>

        </div>

      </header>

      {/* MAIN */}

      <main className="max-w-7xl mx-auto px-6 py-8">

        {activePage === "dashboard" && (
          <div className="space-y-6">

        <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          <button
  onClick={() => setActivePage("alarms")}
  className={`text-left border rounded-3xl p-6 transition hover:border-blue-500 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>
            <div className="text-3xl mb-4">⏰</div>
            <h3 className="text-xl font-bold">Alarms</h3>
            <p className={`mt-2 ${appearance === "Light" ? "text-gray-600" : "text-slate-400"}`}>
  Create, edit and manage your wake-up alarms.
</p>
            <p className="text-blue-400 font-semibold mt-4">{alarms.length} saved alarm{alarms.length === 1 ? "" : "s"}</p>
          </button>
          <button
  onClick={() => setActivePage("challenges")}
  className={`text-left border rounded-3xl p-6 transition hover:border-purple-500 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>
            <div className="text-3xl mb-4">🧠</div>
            <h3 className="text-xl font-bold">Challenges</h3>
            <p className={`mt-2 ${appearance === "Light" ? "text-gray-600" : "text-slate-400"}`}>
  Generate and solve cognitive challenges before starting your day.
</p>
            <p className="text-purple-400 font-semibold mt-4">{selectedChallenge} · {selectedDifficulty}</p>
          </button>
          <button
  onClick={() => setActivePage("analytics")}
  className={`text-left border rounded-3xl p-6 transition hover:border-green-500 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-bold">Analytics</h3>
            <p className={`mt-2 ${appearance === "Light" ? "text-gray-600" : "text-slate-400"}`}>
  Track challenge attempts, correct answers and accuracy.
</p>
            <p className="text-green-400 font-semibold mt-4">{analytics ? `${analytics.accuracy_percentage}% accuracy` : "No data yet"}</p>
          </button>

<button
  onClick={() => setActivePage("habits")}
  className={`text-left border rounded-3xl p-6 transition ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900 hover:border-yellow-500"
      : "bg-slate-900 border-slate-800 text-white hover:border-yellow-500"
  }`}
>
  <div className="text-3xl mb-4">🎯</div>

  <h3 className="text-xl font-bold">Habit Insights</h3>

  <p
    className={`mt-2 ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}
  >
    View your habit score, recommendations and adaptive intelligence.
  </p>

  <p
    className={`font-semibold mt-4 ${
      appearance === "Light" ? "text-yellow-600" : "text-yellow-400"
    }`}
  >
    {habitScore
      ? `${habitScore.overall_score}/100 habit score`
      : "No habit score yet"}
  </p>
</button>

<button
  onClick={handleOpenProfile}
  className={`text-left border rounded-3xl p-6 transition ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900 hover:border-cyan-500"
      : "bg-slate-900 border-slate-800 text-white hover:border-cyan-500"
  }`}
>
  <div className="text-3xl mb-4">👤</div>

  <h3 className="text-xl font-bold">Profile</h3>

  <p
    className={`mt-2 ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}
  >
    Manage your sleep schedule and cognitive preferences.
  </p>

  <p
    className={`font-semibold mt-4 ${
      appearance === "Light" ? "text-cyan-700" : "text-cyan-400"
    }`}
  >
    Open profile settings →
  </p>
</button>

        </section>


<section
  className={`mt-6 border rounded-3xl p-7 transition-colors duration-300 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>
  <h2 className="text-2xl font-bold">
    Welcome to CognitiveAlarm
  </h2>

  <p
    className={`mt-2 max-w-3xl ${
      appearance === "Light"
        ? "text-gray-600"
        : "text-slate-400"
    }`}
  >
    Your intelligent wake-up platform. Use the sidebar to manage each part
    of the system independently.
  </p>

  <div className="mt-6 grid md:grid-cols-3 gap-4">
    <div
      className={`rounded-2xl p-5 border ${
        appearance === "Light"
          ? "bg-gray-50 border-gray-200"
          : "bg-slate-800 border-slate-700"
      }`}
    >
      <p
        className={`text-sm ${
          appearance === "Light"
            ? "text-gray-600"
            : "text-slate-400"
        }`}
      >
        Saved Alarms
      </p>
      <p className="text-3xl font-bold mt-2">
        {alarms.length}
      </p>
    </div>

    <div
      className={`rounded-2xl p-5 border ${
        appearance === "Light"
          ? "bg-gray-50 border-gray-200"
          : "bg-slate-800 border-slate-700"
      }`}
    >
      <p
        className={`text-sm ${
          appearance === "Light"
            ? "text-gray-600"
            : "text-slate-400"
        }`}
      >
        Challenge Attempts
      </p>
      <p className="text-3xl font-bold mt-2">
        {analytics ? analytics.total_attempts : 0}
      </p>
    </div>

    <div
      className={`rounded-2xl p-5 border ${
        appearance === "Light"
          ? "bg-gray-50 border-gray-200"
          : "bg-slate-800 border-slate-700"
      }`}
    >
      <p
        className={`text-sm ${
          appearance === "Light"
            ? "text-gray-600"
            : "text-slate-400"
        }`}
      >
        Accuracy
      </p>
      <p className="text-3xl font-bold text-blue-400 mt-2">
        {analytics ? `${analytics.accuracy_percentage}%` : "0%"}
      </p>
    </div>
  </div>
</section>


          </div>
        )}

        {activePage === "admin" && (
  <div className="space-y-6">


{/* Admin Header */}
<div>
  <h2
    className={`text-3xl font-bold ${
      appearance === "Light" ? "text-gray-900" : "text-white"
    }`}
  >
    🛡️ Admin Dashboard
  </h2>

  <p
    className={`mt-2 ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}
  >
    System-wide user and role management
  </p>
</div>



{/* Admin KPI Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

  <div
    className={`border rounded-2xl p-5 ${
      appearance === "Light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-slate-900 border-slate-800 text-white"
    }`}
  >
    <p className={appearance === "Light" ? "text-gray-600 text-sm" : "text-slate-400 text-sm"}>
      Total Users
    </p>
    <p className="text-3xl font-bold mt-2">
      {adminAnalytics?.total_users ?? 0}
    </p>
  </div>

  <div
    className={`border rounded-2xl p-5 ${
      appearance === "Light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-slate-900 border-slate-800 text-white"
    }`}
  >
    <p className={appearance === "Light" ? "text-gray-600 text-sm" : "text-slate-400 text-sm"}>
      Admins
    </p>
    <p className="text-3xl font-bold mt-2">
      {adminAnalytics?.total_admins ?? 0}
    </p>
  </div>

  <div
    className={`border rounded-2xl p-5 ${
      appearance === "Light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-slate-900 border-slate-800 text-white"
    }`}
  >
    <p className={appearance === "Light" ? "text-gray-600 text-sm" : "text-slate-400 text-sm"}>
      Wellness Coaches
    </p>
    <p className="text-3xl font-bold mt-2">
      {adminAnalytics?.total_coaches ?? 0}
    </p>
  </div>

  <div
    className={`border rounded-2xl p-5 ${
      appearance === "Light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-slate-900 border-slate-800 text-white"
    }`}
  >
    <p className={appearance === "Light" ? "text-gray-600 text-sm" : "text-slate-400 text-sm"}>
      Normal Users
    </p>
    <p className="text-3xl font-bold mt-2">
      {adminAnalytics?.total_normal_users ?? 0}
    </p>
  </div>

</div>



<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">

  {/* Total Challenge Attempts */}
  <div
    className={`border rounded-2xl p-5 ${
      appearance === "Light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-slate-900 border-slate-800 text-white"
    }`}
  >
    <p className={`text-sm ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}>
      🧠 Total Challenge Attempts
    </p>

    <p className="text-3xl font-bold mt-2">
      {adminAnalytics?.total_challenge_attempts ?? 0}
    </p>
  </div>

  {/* Challenge Accuracy */}
  <div
    className={`border rounded-2xl p-5 ${
      appearance === "Light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-slate-900 border-slate-800 text-white"
    }`}
  >
    <p className={`text-sm ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}>
      🎯 Challenge Accuracy
    </p>

    <p className="text-3xl font-bold mt-2">
      {adminAnalytics?.challenge_accuracy ?? 0}%
    </p>
  </div>

  {/* Behavioral Events */}
  <div
    className={`border rounded-2xl p-5 ${
      appearance === "Light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-slate-900 border-slate-800 text-white"
    }`}
  >
    <p className={`text-sm ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}>
      📊 Behavioral Events
    </p>

    <p className="text-3xl font-bold mt-2">
      {adminAnalytics?.behavioral_events ?? 0}
    </p>
  </div>

</div>


{/* Admin Reports */}
<div
  className={`border rounded-2xl p-6 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <div>
      <h2 className="text-xl font-semibold">
        📑 Admin Reports
      </h2>

      <p
        className={`text-sm mt-1 ${
          appearance === "Light"
            ? "text-gray-600"
            : "text-slate-400"
        }`}
      >
        Review system statistics and export reports.
      </p>
    </div>

    <button
      onClick={() => {
        const escapeCSV = (value) =>
          `"${String(value ?? "").replace(/"/g, '""')}"`;

        const reportRows = [
          ["Intelligent Cognitive Alarm - Admin Report"],
          ["Generated At", new Date().toLocaleString()],
          [],
          ["System Overview", "Value"],
          ["Total Users", adminAnalytics?.total_users ?? 0],
          ["Total Admins", adminAnalytics?.total_admins ?? 0],
          ["Wellness Coaches", adminAnalytics?.total_coaches ?? 0],
          ["Normal Users", adminAnalytics?.total_normal_users ?? 0],
          [
            "Total Challenge Attempts",
            adminAnalytics?.total_challenge_attempts ?? 0
          ],
          [
            "Challenge Accuracy (%)",
            adminAnalytics?.challenge_accuracy ?? 0
          ],

[
  "Behavioral Events",
  adminAnalytics?.behavioral_events ?? 0
],
[],
["Challenge Performance by Type"],
[
  "Challenge Type",
  "Total Attempts",
  "Correct Answers",
  "Wrong Answers",
  "Accuracy (%)"
],
...(adminChallengePerformance?.analytics ?? []).map((item) => [
  item.challenge_type,
  item.total_attempts,
  item.correct_answers,
  item.wrong_answers,
  item.accuracy_percentage
]),
[],
["User ID", "Name", "Email", "Role"],
...adminUsers.map((user) => [
  user[0],
  user[1],
  user[2],
  user[3]
])
];


        const csvContent = reportRows
          .map((row) =>
            row.map(escapeCSV).join(",")
          )
          .join("\r\n");

        const blob = new Blob(
          ["\uFEFF" + csvContent],
          { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "intelligent_cognitive_alarm_report.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }}
      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
    >
      ⬇️ Download CSV Report
    </button>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div
      className={`rounded-xl p-4 ${
        appearance === "Light" ? "bg-gray-50" : "bg-slate-800"
      }`}
    >
      <p className="text-sm opacity-70">
        Registered Users
      </p>
      <p className="text-2xl font-bold mt-2">
        {adminAnalytics?.total_users ?? 0}
      </p>
    </div>

    <div
      className={`rounded-xl p-4 ${
        appearance === "Light" ? "bg-gray-50" : "bg-slate-800"
      }`}
    >
      <p className="text-sm opacity-70">
        Challenge Attempts
      </p>
      <p className="text-2xl font-bold mt-2">
        {adminAnalytics?.total_challenge_attempts ?? 0}
      </p>
    </div>

    <div
      className={`rounded-xl p-4 ${
        appearance === "Light" ? "bg-gray-50" : "bg-slate-800"
      }`}
    >
      <p className="text-sm opacity-70">
        Challenge Accuracy
      </p>
      <p className="text-2xl font-bold mt-2">
        {adminAnalytics?.challenge_accuracy ?? 0}%
      </p>
    </div>
  </div>

  <p
    className={`text-xs mt-4 ${
      appearance === "Light" ? "text-gray-500" : "text-slate-400"
    }`}
  >
    The CSV includes available system statistics and the user
    list. Refresh the dashboard before exporting to get updated data.
  </p>
</div>


{/* Challenge Performance Chart */}
<div
  className={`border rounded-2xl p-6 mb-6 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
    <div>
      <h2 className="text-xl font-semibold">
        📊 Challenge Accuracy Overview
      </h2>
      <p
        className={`text-sm mt-1 ${
          appearance === "Light"
            ? "text-gray-600"
            : "text-slate-400"
        }`}
      >
        Compare correct-answer percentages across challenge types.
      </p>
    </div>

    <div
      className={`rounded-xl px-4 py-3 ${
        appearance === "Light"
          ? "bg-indigo-50"
          : "bg-indigo-500/10"
      }`}
    >
      <p className="text-xs text-indigo-400">
        Total Attempts
      </p>
      <p className="text-2xl font-bold">
        {(adminChallengePerformance.analytics || []).reduce(
          (total, item) =>
            total + (Number(item.total_attempts) || 0),
          0
        )}
      </p>
    </div>
  </div>

  <div className="space-y-6">
    {(adminChallengePerformance.analytics || []).length === 0 ? (
      <p
        className={`text-sm py-6 text-center ${
          appearance === "Light"
            ? "text-gray-500"
            : "text-slate-400"
        }`}
      >
        No challenge performance data available yet.
      </p>
    ) : (
      adminChallengePerformance.analytics.map((item) => {
        const accuracy = Math.min(
          100,
          Math.max(0, Number(item.accuracy_percentage) || 0)
        );

        return (
          <div key={item.challenge_type}>
            <div className="flex justify-between items-center gap-3 mb-2">
              <span className="font-medium">
                {item.challenge_type}
              </span>

              <span className="text-sm font-semibold tabular-nums">
                {accuracy.toFixed(2)}%
              </span>
            </div>

            <div
              className={`w-full h-3 rounded-full overflow-hidden ${
                appearance === "Light"
                  ? "bg-gray-100"
                  : "bg-slate-800"
              }`}
            >
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-indigo-500 to-cyan-400"
                style={{ width: `${accuracy}%` }}
                role="progressbar"
                aria-label={`${item.challenge_type} accuracy`}
                aria-valuenow={accuracy}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

            <p
              className={`text-xs mt-2 ${
                appearance === "Light"
                  ? "text-gray-500"
                  : "text-slate-400"
              }`}
            >
              {item.correct_answers} correct out of{" "}
              {item.total_attempts} attempts
              {" · "}
              {item.wrong_answers} wrong
            </p>
          </div>
        );
      })
    )}
  </div>
</div>


{/* Challenge Performance by Type */}
<div
  className={`border rounded-2xl p-6 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>
  <h2 className="text-xl font-semibold mb-2">
    🧠 Challenge Performance by Type
  </h2>

  <p
    className={`text-sm mb-5 ${
      appearance === "Light"
        ? "text-gray-600"
        : "text-slate-400"
    }`}
  >
    System-wide attempts, correct answers, wrong answers and accuracy.
  </p>

  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr
          className={`border-b ${
            appearance === "Light"
              ? "border-gray-200"
              : "border-slate-700"
          }`}
        >
          <th className="text-left py-3 px-3">Challenge Type</th>
          <th className="text-center py-3 px-3">Attempts</th>
          <th className="text-center py-3 px-3">Correct</th>
          <th className="text-center py-3 px-3">Wrong</th>
          <th className="text-center py-3 px-3">Accuracy</th>
        </tr>
      </thead>

      <tbody>
        {adminChallengePerformance.analytics.length === 0 ? (
          <tr>
            <td colSpan={5} className="py-5 text-center">
              No challenge performance data available.
            </td>
          </tr>
        ) : (
          adminChallengePerformance.analytics.map((item) => (
            <tr
              key={item.challenge_type}
              className={`border-b ${
                appearance === "Light"
                  ? "border-gray-100"
                  : "border-slate-800"
              }`}
            >
              <td className="py-3 px-3 font-medium">
                {item.challenge_type}
              </td>
              <td className="py-3 px-3 text-center">
                {item.total_attempts}
              </td>
              <td className="py-3 px-3 text-center text-green-500">
                {item.correct_answers}
              </td>
              <td className="py-3 px-3 text-center text-red-400">
                {item.wrong_answers}
              </td>
              <td className="py-3 px-3 text-center font-semibold">
                {item.accuracy_percentage}%
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</div>



    {/* User Management */}
<div
  className={`border rounded-2xl p-6 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  } ${userRole === "admin" ? "" : "hidden"}`}
>
  <div className="flex items-center justify-between mb-5">
    <div>
      <h2 className="text-xl font-semibold">
        User Management
      </h2>

      <p
        className={`text-sm mt-1 ${
          appearance === "Light"
            ? "text-gray-600"
            : "text-slate-400"
        }`}
      >
        Registered users and their assigned roles
      </p>
    </div>

        <button

onClick={() => {
  loadAdminUsers();
  loadAdminAnalytics();
  loadAdminChallengePerformance();
}}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold"
        >
          🔄 Refresh
        </button>

      </div>

      {adminLoading ? (
        <p className="text-slate-400">
          Loading users...
        </p>
      ) : (
        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead>
              <tr className="border-b border-slate-800 text-slate-400">

                <th className="text-left py-3 px-3">
                  ID
                </th>

                <th className="text-left py-3 px-3">
                  Name
                </th>

                <th className="text-left py-3 px-3">
                  Email
                </th>

                <th className="text-left py-3 px-3">
                  Role
                </th>

              </tr>
            </thead>

            <tbody>

              {adminUsers.map((user) => (

                <tr
                  key={user[0]}
                  className="border-b border-slate-800"
                >

                  <td className="py-3 px-3">
                    {user[0]}
                  </td>

                  <td className="py-3 px-3 font-medium">
                    {user[1]}
                  </td>

                  <td className="py-3 px-3 text-slate-400">
                    {user[2]}
                  </td>

                  <td className="py-3 px-3">
                    {user[3]}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      )}

    </div>

  </div>
)}


        {activePage === "coach" && (
  <div className="space-y-6">

    {/* Header */}
    <div>
  <h1
    className={`text-3xl font-bold ${
      appearance === "Light" ? "text-gray-900" : "text-white"
    }`}
  >
    🧑‍🏫 Wellness Coach Dashboard
  </h1>

      <p className={`mt-1 ${appearance === "Light" ? "text-gray-600" : "text-slate-400"}`}>
  Machine-learning based challenge difficulty recommendation from your behavior.
</p>
    </div>




      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="text-slate-400 text-sm">
          Total Users
        </p>

        <p className="text-3xl font-bold mt-2 text-white">
          {coachHabitScores.length}
        </p>
      </div>

            {/* Average Habit Score */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="text-slate-400 text-sm">
          Average Habit Score
        </p>

        <p className="text-3xl font-bold mt-2 text-white">
          {coachHabitScores.filter(
            user =>
              user.created_at != null &&
              user.overall_score != null
          ).length > 0
            ? (
                coachHabitScores
                  .filter(
                    user =>
                      user.created_at != null &&
                      user.overall_score != null
                  )
                  .reduce(
                    (sum, user) => sum + Number(user.overall_score),
                    0
                  ) /
                coachHabitScores.filter(
                  user =>
                    user.created_at != null &&
                    user.overall_score != null
                ).length
              ).toFixed(1)
            : "No data"}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="text-slate-400 text-sm">
          Strong Habits
        </p>

        <p className="text-3xl font-bold mt-2 text-white">

{
  coachHabitScores.filter(
    user =>
      user.created_at != null &&
      user.overall_score != null &&
      Number(user.overall_score) >= 70
  ).length
}

        </p>

        <p className="text-xs text-slate-400 mt-2">
          Score ≥ 70
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="text-slate-400 text-sm">
          Needs Attention
        </p>

        <p className="text-3xl font-bold mt-2 text-white">

{
  coachHabitScores.filter(
    user =>
      user.created_at != null &&
      user.overall_score != null &&
      Number(user.overall_score) < 70
  ).length
}

        </p>

        <p className="text-xs text-slate-400 mt-2">
          Score below 70
        </p>
      </div>

    </div>


{/* User Habit Analytics */}
<div
  className={`border rounded-2xl p-6 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>
  <h2 className="text-xl font-semibold mb-5">
    User Habit Analytics
  </h2>

  {coachHabitScores.length === 0 ? (
    <p
      className={
        appearance === "Light" ? "text-gray-600" : "text-slate-400"
      }
    >
      No habit data available yet.
    </p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr
            className={`border-b ${
              appearance === "Light"
                ? "border-gray-200 text-gray-600"
                : "border-slate-800 text-slate-400"
            }`}
          >
            <th className="text-left py-3 px-3">User</th>
            <th className="text-left py-3 px-3">Email</th>
            <th className="text-center py-3 px-3">Wake-up</th>
            <th className="text-center py-3 px-3">Challenge</th>
            <th className="text-center py-3 px-3">Snooze</th>
            <th className="text-center py-3 px-3">Sleep</th>
            <th className="text-center py-3 px-3">Overall</th>
          </tr>
        </thead>

        <tbody>
          {coachHabitScores.map((user) => (
            <tr
              key={user.user_id}
              className={`border-b ${
                appearance === "Light"
                  ? "border-gray-100"
                  : "border-slate-800/50"
              }`}
            >
              <td
                className={`py-4 px-3 font-medium ${
                  appearance === "Light"
                    ? "text-gray-900"
                    : "text-white"
                }`}
              >
                {user.name}
              </td>

              <td
                className={`py-4 px-3 ${
                  appearance === "Light"
                    ? "text-gray-600"
                    : "text-slate-400"
                }`}
              >
                {user.email}
              </td>

              <td className="py-4 px-3 text-center">
                {user.created_at
                  ? `${user.wake_up_consistency}%`
                  : "No data"}
              </td>

              <td className="py-4 px-3 text-center">
                {user.created_at
                  ? `${user.challenge_success}%`
                  : "No data"}
              </td>

              <td className="py-4 px-3 text-center">
                {user.created_at
                  ? `${user.snooze_reduction}%`
                  : "No data"}
              </td>

              <td className="py-4 px-3 text-center">
                {user.created_at
                  ? `${user.sleep_adherence}%`
                  : "No data"}
              </td>

              <td className="py-4 px-3 text-center">
                <span
                  className={`font-bold ${
                    Number(user.overall_score) >= 70
                      ? appearance === "Light"
                        ? "text-green-700"
                        : "text-green-400"
                      : appearance === "Light"
                        ? "text-yellow-700"
                        : "text-yellow-400"
                  }`}
                >
                  {user.created_at
                    ? user.overall_score
                    : "No data"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>


  </div>
)}


{activePage === "executive" && (
  <main
    className={`max-w-7xl mx-auto px-6 py-8 space-y-8 transition-colors duration-300 ${
      appearance === "Light"
        ? "text-gray-900"
        : "text-white"
    }`}
  >
    {/* Header */}
    <div>
      <h1 className="text-3xl font-bold">
        📈 Executive Dashboard
      </h1>

      <p
        className={`mt-2 ${
          appearance === "Light"
            ? "text-gray-600"
            : "text-slate-400"
        }`}
      >
        Overall performance, behavioral analytics and AI insights
      </p>
    </div>

    {/* Executive KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Alarm Success */}
      <div
        className={`border rounded-2xl p-5 ${
          appearance === "Light"
            ? "bg-white border-gray-200"
            : "bg-slate-900 border-slate-800"
        }`}
      >
        <p
          className={`text-sm ${
            appearance === "Light"
              ? "text-gray-600"
              : "text-slate-400"
          }`}
        >
          Alarm Success
        </p>

        <p className="text-3xl font-bold mt-2">100%</p>

        <p className="text-xs text-green-500 mt-2">
          Cognitive workflow operational
        </p>
      </div>

      {/* Challenge Accuracy */}
      <div
        className={`border rounded-2xl p-5 ${
          appearance === "Light"
            ? "bg-white border-gray-200"
            : "bg-slate-900 border-slate-800"
        }`}
      >
        <p
          className={`text-sm ${
            appearance === "Light"
              ? "text-gray-600"
              : "text-slate-400"
          }`}
        >
          Challenge Accuracy
        </p>

        <p className="text-3xl font-bold mt-2">
          {mlPrediction?.input_data?.accuracy ?? "—"}%
        </p>

        <p
          className={`text-xs mt-2 ${
            appearance === "Light"
              ? "text-gray-600"
              : "text-slate-400"
          }`}
        >
          Based on recorded attempts
        </p>
      </div>

      {/* Total Challenges */}
      <div
        className={`border rounded-2xl p-5 ${
          appearance === "Light"
            ? "bg-white border-gray-200"
            : "bg-slate-900 border-slate-800"
        }`}
      >
        <p
          className={`text-sm ${
            appearance === "Light"
              ? "text-gray-600"
              : "text-slate-400"
          }`}
        >
          Total Challenges
        </p>

        <p className="text-3xl font-bold mt-2">9</p>

        <p
          className={`text-xs mt-2 ${
            appearance === "Light"
              ? "text-gray-600"
              : "text-slate-400"
          }`}
        >
          7 correct · 2 wrong
        </p>
      </div>

      {/* Behavioral Events */}
      <div
        className={`border rounded-2xl p-5 ${
          appearance === "Light"
            ? "bg-white border-gray-200"
            : "bg-slate-900 border-slate-800"
        }`}
      >
        <p
          className={`text-sm ${
            appearance === "Light"
              ? "text-gray-600"
              : "text-slate-400"
          }`}
        >
          Behavioral Events
        </p>

        <p className="text-3xl font-bold mt-2">
          {behavioralEvents?.length ?? 0}
        </p>

        <p
          className={`text-xs mt-2 ${
            appearance === "Light"
              ? "text-gray-600"
              : "text-slate-400"
          }`}
        >
          User activity recorded
        </p>
      </div>
    </div>




{/* AI & System Overview */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

  {/* AI System Status */}
  <div
    className={`border rounded-3xl p-6 ${
      appearance === "Light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-slate-900 border-slate-800 text-white"
    }`}
  >
    <h2 className="text-xl font-bold mb-5">
      🤖 AI & Recommendation System
    </h2>

    <div className="space-y-4">

      <div className="flex items-center justify-between gap-4">
        <span className={appearance === "Light" ? "text-gray-600" : "text-slate-400"}>
          AI Difficulty Engine
        </span>

        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-300 font-semibold">
          Active
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className={appearance === "Light" ? "text-gray-600" : "text-slate-400"}>
          ML Prediction
        </span>

        <span className="font-semibold">
          {mlPrediction ? "Available" : "Unavailable"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className={appearance === "Light" ? "text-gray-600" : "text-slate-400"}>
          Recommendation Engine
        </span>

        <span className="font-semibold text-right">
          {recommendations?.length ?? 0} Recommendations
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className={appearance === "Light" ? "text-gray-600" : "text-slate-400"}>
          Behavioral Analytics
        </span>

        <span className="font-semibold">
          {behavioralEvents?.length ?? 0} Events
        </span>
      </div>

    </div>
  </div>






{/* System Health Overview */}
<div
  className={`border rounded-3xl p-6 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>
  <h2 className="text-xl font-bold mb-5">
    ⚙️ System Health
  </h2>

  <div className="space-y-4">

    <div className="flex items-center justify-between">
      <span className={appearance === "Light" ? "text-gray-600" : "text-slate-400"}>
        ⚡ Backend API
      </span>

      <span className={`px-3 py-1 rounded-full bg-green-500/20 font-semibold ${
        appearance === "Light" ? "text-green-700" : "text-green-300"
      }`}>
        Operational
      </span>
    </div>

    <div className="flex items-center justify-between">
      <span className={appearance === "Light" ? "text-gray-600" : "text-slate-400"}>
        🗄️ Database
      </span>

      <span className={`px-3 py-1 rounded-full bg-green-500/20 font-semibold ${
        appearance === "Light" ? "text-green-700" : "text-green-300"
      }`}>
        Connected
      </span>
    </div>

    <div className="flex items-center justify-between">
      <span className={appearance === "Light" ? "text-gray-600" : "text-slate-400"}>
        🔔 Notification System
      </span>

      <span className={`px-3 py-1 rounded-full bg-green-500/20 font-semibold ${
        appearance === "Light" ? "text-green-700" : "text-green-300"
      }`}>
        Active
      </span>
    </div>

    <div className="flex items-center justify-between">
      <span className={appearance === "Light" ? "text-gray-600" : "text-slate-400"}>
        🤖 ML Engine
      </span>

      <span className={`px-3 py-1 rounded-full bg-green-500/20 font-semibold ${
        appearance === "Light" ? "text-green-700" : "text-green-300"
      }`}>
        Active
      </span>
    </div>

    <div className="flex items-center justify-between">
      <span className={appearance === "Light" ? "text-gray-600" : "text-slate-400"}>
        📊 Analytics Engine
      </span>

      <span className={`px-3 py-1 rounded-full bg-green-500/20 font-semibold ${
        appearance === "Light" ? "text-green-700" : "text-green-300"
      }`}>
        Active
      </span>
    </div>

  </div>
</div>

</div>




{/* Executive Insights */}
<div
  className={`border rounded-3xl p-6 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>
  <h2 className="text-xl font-bold mb-5">
    💡 Executive Insights
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    {/* Wake-up Insight */}
    <div
      className={`rounded-2xl p-4 ${
        appearance === "Light"
          ? "bg-gray-100 text-gray-900"
          : "bg-slate-800 text-white"
      }`}
    >
      <p className="font-semibold">
        ⏰ Wake-up Consistency
      </p>

      <p
        className={`text-sm mt-2 ${
          appearance === "Light"
            ? "text-gray-600"
            : "text-slate-400"
        }`}
      >
        {habitScore?.wake_up_consistency >= 70
          ? "Wake-up consistency is performing well. Continue maintaining your regular schedule."
          : "Wake-up consistency needs improvement. Following a consistent wake-up schedule can improve your overall habit score."}
      </p>
    </div>



{/* Cognitive Insight */}
<div
  className={`rounded-2xl p-4 ${
    appearance === "Light"
      ? "bg-gray-100 text-gray-900"
      : "bg-slate-800 text-white"
  }`}
>
  <p className="font-semibold">
    🧠 Cognitive Performance
  </p>

  <p
    className={`text-sm mt-2 ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}
  >
    {mlPrediction?.input_data?.accuracy >= 80
      ? "Cognitive challenge performance is strong. The system can continue increasing challenge difficulty."
      : "Continue completing cognitive challenges regularly to improve accuracy and support adaptive difficulty."}
  </p>
</div>

{/* Snooze Insight */}
<div
  className={`rounded-2xl p-4 ${
    appearance === "Light"
      ? "bg-gray-100 text-gray-900"
      : "bg-slate-800 text-white"
  }`}
>
  <p className="font-semibold">
    😴 Snooze Management
  </p>

  <p
    className={`text-sm mt-2 ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}
  >
    {mlPrediction?.input_data?.snoozes <= 1
      ? "Snooze usage is under control. Keep maintaining this positive morning routine."
      : "Snooze usage can be reduced further to build a stronger and more consistent morning routine."}
  </p>
</div>

{/* AI Insight */}
<div
  className={`rounded-2xl p-4 ${
    appearance === "Light"
      ? "bg-gray-100 text-gray-900"
      : "bg-slate-800 text-white"
  }`}
>
  <p className="font-semibold">
    🤖 AI Adaptation
  </p>

  <p
    className={`text-sm mt-2 ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}
  >
    {mlPrediction
      ? `The AI engine recommends ${mlPrediction.ml_prediction?.difficulty || "adaptive"} difficulty based on the user's challenge performance.`
      : "The AI engine is analyzing user performance to generate adaptive difficulty recommendations."}
  </p>
</div>

</div>

</div>

</main>
)}

{activePage === "alarms" && (
  <section id="alarms" className="scroll-mt-6">


{/* CREATE ALARM */}
<div
  className={`rounded-2xl p-6 mt-6 ${
    appearance === "Light"
      ? "bg-gray-100 text-gray-900"
      : "bg-slate-800 text-white"
  }`}
>
  <h3 className="text-xl font-semibold mb-5">
    Create New Alarm
  </h3>

  <div className="grid md:grid-cols-2 gap-5">

    {/* Alarm Name */}
    <div>
      <label
        className={`block text-sm mb-2 ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}
      >
        Alarm Name
      </label>

      <input
        type="text"
        value={alarmName}
        onChange={(e) => setAlarmName(e.target.value)}
        placeholder="Morning Alarm"
        className={`w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 ${
          appearance === "Light"
            ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
            : "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
        }`}
      />
    </div>

    {/* Alarm Time */}
    <div>
      <label
        className={`block text-sm mb-2 ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}
      >
        Alarm Time
      </label>

      <input
        type="time"
        value={alarmTime}
        onChange={(e) => setAlarmTime(e.target.value)}
        className={`w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 ${
          appearance === "Light"
            ? "bg-white border-gray-300 text-gray-900"
            : "bg-slate-900 border-slate-700 text-white"
        }`}
      />
    </div>

  </div>



{/* Choose Challenge Type */}
<div className="mt-5">
  <label
    className={`block text-sm mb-2 ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}
  >
    Choose Challenge
  </label>

  <select
    value={selectedChallenge}
    onChange={(e) => {
      setSelectedChallenge(e.target.value);
      setSelectedDifficulty("");
    }}
    className={`w-full border rounded-xl px-4 py-3 ${
      appearance === "Light"
        ? "bg-white border-gray-300 text-gray-900"
        : "bg-slate-900 border-slate-700 text-white"
    }`}
  >
    <option value="">Select challenge type</option>
    {[...new Set(challenges.map((c) => c[1]))].map((type) => (
      <option key={type} value={type}>
        {type}
      </option>
    ))}
  </select>
</div>

{/* Choose Difficulty */}
<div className="mt-4">
  <label
    className={`block text-sm mb-2 ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}
  >
    Choose Difficulty
  </label>

  <select
    value={selectedDifficulty}
    onChange={(e) => setSelectedDifficulty(e.target.value)}
    disabled={!selectedChallenge}
    className={`w-full border rounded-xl px-4 py-3 ${
      appearance === "Light"
        ? "bg-white border-gray-300 text-gray-900"
        : "bg-slate-900 border-slate-700 text-white"
    }`}
  >
    <option value="">Select difficulty</option>
    {(difficultyOptions[selectedChallenge] || []).map((difficulty) => (
      <option key={difficulty} value={difficulty}>
        {difficulty}
      </option>
    ))}
  </select>
</div>


{/* Alarm Type */}
<div className="mt-5">
  <label
    className={`block text-sm mb-2 ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}
  >
    Alarm Type
  </label>

  <select
    value={alarmType}
    onChange={(e) => setAlarmType(e.target.value)}
    className={`w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 ${
      appearance === "Light"
        ? "bg-white border-gray-300 text-gray-900"
        : "bg-slate-900 border-slate-700 text-white"
    }`}
  >
    <option value="Daily Alarm">Daily Alarm</option>
    <option value="Custom Alarm">Custom Alarm</option>
  </select>
</div>

{/* Recurrence Days */}
{alarmType === "Custom Alarm" && (
  <div className="mt-5">
    <label
      className={`block text-sm mb-3 ${
        appearance === "Light" ? "text-gray-600" : "text-slate-400"
      }`}
    >
      Recurrence Days
    </label>

    <div className="flex flex-wrap gap-2">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
        <button
          key={day}
          type="button"
          onClick={() => {
            setRecurrenceDays((prev) =>
              prev.includes(day)
                ? prev.filter((d) => d !== day)
                : [...prev, day]
            );
          }}
          className={`px-4 py-2 rounded-xl border transition ${
            recurrenceDays.includes(day)
              ? "bg-blue-600 border-blue-500 text-white"
              : appearance === "Light"
                ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-200"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700"
          }`}
        >
          {day}
        </button>
      ))}
    </div>
  </div>
)}


{/* Alarm Date */}
{alarmType === "Custom Alarm" && (
  <div className="mt-5">
    <label
      className={`block text-sm mb-2 ${
        appearance === "Light" ? "text-gray-600" : "text-slate-400"
      }`}
    >
      Alarm Date
    </label>

    <input
      type="date"
      value={alarmDate}
      onChange={(e) => setAlarmDate(e.target.value)}
      className={`w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 ${
        appearance === "Light"
          ? "bg-white border-gray-300 text-gray-900"
          : "bg-slate-900 border-slate-700 text-white"
      }`}
    />
  </div>
)}

{/* Time Zone */}
<div className="mt-5">
  <label
    className={`block text-sm mb-2 ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}
  >
    Time Zone
  </label>

  <select
    value={alarmTimeZone}
    onChange={(e) => setAlarmTimeZone(e.target.value)}
    className={`w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 ${
      appearance === "Light"
        ? "bg-white border-gray-300 text-gray-900"
        : "bg-slate-900 border-slate-700 text-white"
    }`}
  >
    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
    <option value="Asia/Dubai">Asia/Dubai</option>
    <option value="Asia/Singapore">Asia/Singapore</option>
    <option value="Europe/London">Europe/London</option>
    <option value="America/New_York">America/New_York</option>
    <option value="America/Los_Angeles">America/Los_Angeles</option>
  </select>
</div>

{/* Smart Window + Snooze Limit */}
<div className="grid md:grid-cols-2 gap-5 mt-5">

  {/* Smart Window */}
  <div>
    <label
      className={`block text-sm mb-2 ${
        appearance === "Light" ? "text-gray-600" : "text-slate-400"
      }`}
    >
      Smart Window
    </label>

    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        max="120"
        value={smartWindowMinutes}
        onChange={(e) =>
          setSmartWindowMinutes(Number(e.target.value))
        }
        className={`w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 ${
          appearance === "Light"
            ? "bg-white border-gray-300 text-gray-900"
            : "bg-slate-900 border-slate-700 text-white"
        }`}
      />

      <span
        className={`text-sm ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}
      >
        min
      </span>
    </div>
  </div>




{/* Snooze Limit */}
<div>
  <label
    className={`block text-sm mb-2 ${
      appearance === "Light" ? "text-gray-600" : "text-slate-400"
    }`}
  >
    Snooze Limit
  </label>

  <div className="flex items-center gap-2">
    <input
      type="number"
      min="0"
      max="10"
      value={snoozeLimit}
      onChange={(e) =>
        setSnoozeLimit(Number(e.target.value))
      }
      className={`w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 ${
        appearance === "Light"
          ? "bg-white border-gray-300 text-gray-900"
          : "bg-slate-900 border-slate-700 text-white"
      }`}
    />

    <span
      className={`text-sm ${
        appearance === "Light" ? "text-gray-600" : "text-slate-400"
      }`}
    >
      times
    </span>
  </div>
</div>

</div>

{/* Create Alarm Button */}
<button
  onClick={createAlarm}
  className="mt-5 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition"
>
  Create Alarm
</button>



                {/* SAVED ALARMS */}
<div className="mt-8">

  <div className="flex items-center justify-between mb-4">
    <h3 className="text-xl font-semibold">
      Your Saved Alarms
    </h3>

    <button
  type="button"
  onClick={async () => {
    console.log("Saved Alarms Refresh clicked");

    try {
      await loadAlarms();
    } catch (error) {
      console.error("Failed to refresh saved alarms:", error);
    }
  }}
  className={`px-4 py-2 rounded-xl text-sm transition ${
    appearance === "Light"
      ? "bg-gray-200 hover:bg-gray-300 text-gray-900"
      : "bg-slate-800 hover:bg-slate-700 text-white"
  }`}
>
  Refresh
</button>
  </div>

  {alarms.length === 0 ? (
    <div
      className={`rounded-2xl p-6 text-center ${
        appearance === "Light"
          ? "bg-gray-100 text-gray-900"
          : "bg-slate-800 text-white"
      }`}
    >
      <p className={appearance === "Light" ? "text-gray-600" : "text-slate-400"}>
        No alarms created yet.
      </p>
    </div>
  ) : (
    <div className="grid gap-4">
      {alarms.map((alarm) => (
        <div
          key={alarm[0]}
          className={`rounded-2xl p-5 border ${
            appearance === "Light"
              ? "bg-white border-gray-200 text-gray-900"
              : "bg-slate-800 border-slate-700 text-white"
          }`}
        >

          {editingAlarmId === alarm[0] ? (
            /* EDIT MODE */
            <div>
              <h4 className="text-xl font-semibold mb-5">
                ✏️ Edit Alarm
              </h4>

              <div className="grid md:grid-cols-2 gap-5">

                {/* Alarm Name */}
                <div>
                  <label
                    className={`block mb-2 ${
                      appearance === "Light" ? "text-gray-600" : "text-slate-300"
                    }`}
                  >
                    Alarm Name
                  </label>

                  <input
                    type="text"
                    value={editAlarmName}
                    onChange={(e) =>
                      setEditAlarmName(e.target.value)
                    }
                    className={`w-full px-4 py-3 rounded-xl border outline-none focus:border-blue-500 ${
                      appearance === "Light"
                        ? "bg-white border-gray-300 text-gray-900"
                        : "bg-slate-900 border-slate-700 text-white"
                    }`}
                  />
                </div>

                {/* Alarm Time */}
                <div>
                  <label
                    className={`block mb-2 ${
                      appearance === "Light" ? "text-gray-600" : "text-slate-300"
                    }`}
                  >
                    Alarm Time
                  </label>

                  <input
                    type="time"
                    value={editAlarmTime}
                    onChange={(e) =>
                      setEditAlarmTime(e.target.value)
                    }
                    className={`w-full px-4 py-3 rounded-xl border outline-none focus:border-blue-500 ${
                      appearance === "Light"
                        ? "bg-white border-gray-300 text-gray-900"
                        : "bg-slate-900 border-slate-700 text-white"
                    }`}
                  />
                </div>

              </div>


{/* Edit Alarm - Choose Challenge */}
<div className="mt-5">
  <label
    className={`block mb-2 ${
      appearance === "Light" ? "text-gray-600" : "text-slate-300"
    }`}
  >
    Choose Challenge
  </label>

  <select
    value={editSelectedChallenge}
    onChange={(e) => {
      setEditSelectedChallenge(e.target.value);
      setEditSelectedDifficulty("");
    }}
    className={`w-full px-4 py-3 rounded-xl border ${
      appearance === "Light"
        ? "bg-white border-gray-300 text-gray-900"
        : "bg-slate-900 border-slate-700 text-white"
    }`}
  >
    <option value="">Select challenge type</option>

    {[...new Set(challenges.map((c) => c[1]))].map((type) => (
      <option key={type} value={type}>
        {type}
      </option>
    ))}
  </select>
</div>

{/* Edit Alarm - Choose Difficulty */}
<div className="mt-5">
  <label
    className={`block mb-2 ${
      appearance === "Light" ? "text-gray-600" : "text-slate-300"
    }`}
  >
    Choose Difficulty
  </label>

  <select
    value={editSelectedDifficulty}
    onChange={(e) => setEditSelectedDifficulty(e.target.value)}
    disabled={!editSelectedChallenge}
    className={`w-full px-4 py-3 rounded-xl border ${
      appearance === "Light"
        ? "bg-white border-gray-300 text-gray-900"
        : "bg-slate-900 border-slate-700 text-white"
    }`}
  >
    <option value="">Select difficulty</option>

    {["Easy", "Beginner", "Medium", "Hard", "Expert"].map(
      (difficulty) => (
        <option key={difficulty} value={difficulty}>
          {difficulty}
        </option>
      )
    )}
  </select>
</div>



{/* Edit Alarm Type */}
<div className="mt-5">
  <label
    className={`block mb-2 ${
      appearance === "Light"
        ? "text-gray-600"
        : "text-slate-300"
    }`}
  >
    Alarm Type
  </label>

  <select
    value={editAlarmType}
    onChange={(e) => setEditAlarmType(e.target.value)}
    className={`w-full px-4 py-3 rounded-xl border outline-none focus:border-blue-500 ${
      appearance === "Light"
        ? "bg-white border-gray-300 text-gray-900"
        : "bg-slate-900 border-slate-700 text-white"
    }`}
  >
    <option value="Daily Alarm">Daily Alarm</option>
    <option value="Custom Alarm">Custom Alarm</option>
  </select>
</div>



{/* Edit Recurrence Days */}
{editAlarmType === "Custom Alarm" && (
  <div className="mt-5">
    <label
      className={`block mb-3 ${
        appearance === "Light"
          ? "text-gray-600"
          : "text-slate-300"
      }`}
    >
      Recurrence Days
    </label>

    <div className="flex flex-wrap gap-2">
      {[
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun",
      ].map((day) => (
        <button
          key={day}
          type="button"
          onClick={() => {
            setEditRecurrenceDays((prev) =>
              prev.includes(day)
                ? prev.filter((d) => d !== day)
                : [...prev, day]
            );
          }}
          className={`px-4 py-2 rounded-xl border transition ${
            editRecurrenceDays.includes(day)
              ? "bg-blue-600 border-blue-500 text-white"
              : appearance === "Light"
                ? "bg-white border-gray-300 text-gray-600 hover:bg-gray-100"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"
          }`}
        >
          {day}
        </button>
      ))}
    </div>
  </div>
)}



{/* Edit Alarm Date */}
{editAlarmType === "Custom Alarm" && (
  <div className="mt-5">
    <label
      className={`block mb-2 ${
        appearance === "Light"
          ? "text-gray-600"
          : "text-slate-300"
      }`}
    >
      Alarm Date
    </label>

    <input
      type="date"
      value={editAlarmDate}
      onChange={(e) => setEditAlarmDate(e.target.value)}
      className={`w-full px-4 py-3 rounded-xl border outline-none focus:border-blue-500 ${
        appearance === "Light"
          ? "bg-white border-gray-300 text-gray-900"
          : "bg-slate-900 border-slate-700 text-white"
      }`}
    />
  </div>
)}


{/* Edit Time Zone */}
<div className="mt-5">
  <label
    className={`block mb-2 ${
      appearance === "Light"
        ? "text-gray-600"
        : "text-slate-300"
    }`}
  >
    Time Zone
  </label>

  <select
    value={editAlarmTimeZone}
    onChange={(e) => setEditAlarmTimeZone(e.target.value)}
    className={`w-full px-4 py-3 rounded-xl border outline-none focus:border-blue-500 ${
      appearance === "Light"
        ? "bg-white border-gray-300 text-gray-900"
        : "bg-slate-900 border-slate-700 text-white"
    }`}
  >
    <option value="Asia/Kolkata">Asia/Kolkata (India)</option>
    <option value="UTC">UTC</option>
    <option value="America/New_York">America/New_York</option>
    <option value="Europe/London">Europe/London</option>
  </select>
</div>


                                    {/* Edit Alarm Settings */}

                  <div className="grid md:grid-cols-2 gap-5 mt-5">

                    {/* Smart Window */}

                    <div>

                      <label className="block text-slate-300 mb-2">
                        Smart Window (minutes)
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={editSmartWindowMinutes}
                        onChange={(e) =>
                          setEditSmartWindowMinutes(e.target.value)
                        }
                        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500"
                      />

                    </div>


                    {/* Snooze Limit */}

                    <div>

                      <label className="block text-slate-300 mb-2">
                        Snooze Limit
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={editSnoozeLimit}
                        onChange={(e) =>
                          setEditSnoozeLimit(e.target.value)
                        }
                        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500"
                      />

                    </div>

                  </div>


                  <div className="flex gap-3 mt-5">

                    <button
                      onClick={handleUpdateAlarm}
                      className="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition"
                    >
                      💾 Save Changes
                    </button>


                    <button
                      onClick={handleCancelEdit}
                      className="px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold transition"
                    >
                      ❌ Cancel
                    </button>

                  </div>

                </div>

              ) : (

                /* =====================================================
                   NORMAL MODE
                ===================================================== */

                <div className="flex items-center justify-between">

                  <div>

                    <h4 className="text-lg font-semibold">
                      {alarm[3]}
                    </h4>

                    <p className="text-3xl font-bold text-blue-400 mt-1">
                      {formatAlarmTime(alarm[2])}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-300">

  <span className="px-2 py-1 rounded-lg bg-slate-900">
    {alarm[5] || "Daily Alarm"}
  </span>

  <span className="px-2 py-1 rounded-lg bg-slate-900">
    TZ: {alarm[8] || "Asia/Kolkata"}
  </span>

  <span className="px-2 py-1 rounded-lg bg-slate-900">
    Window: {alarm[9] ?? 30}m
  </span>

  <span className="px-2 py-1 rounded-lg bg-slate-900">
    Snooze: {alarm[11] ?? 0}/{alarm[10] ?? 3}
  </span>

</div>
                  </div>


                  <div className="flex items-center gap-3 flex-wrap">

                    {alarm[4] ? (

                      <span className="px-4 py-2 rounded-xl bg-green-600/20 text-green-400">
                        Active
                      </span>

                    ) : (

                      <span className="px-4 py-2 rounded-xl bg-red-600/20 text-red-400">
                        Inactive
                      </span>

                    )}


                    <button
                      onClick={() => handleSnoozeAlarm(alarm[0])}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition"
                      title="Snooze alarm"
                    >
                      😴 Snooze
                    </button>

                    <button
                      onClick={() => handleEditAlarm(alarm)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                      title="Edit alarm"
                    >
                      ✏️ Edit
                    </button>


                    <button
                      onClick={() => handleDeleteAlarm(alarm[0])}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition"
                      title="Delete alarm"
                    >
                      🗑️ Delete
                    </button>

                  </div>

                </div>

              )}

            </div>

          ))}

                    </div>

                  )}

                          </div>

        </div>

      </section>
)}


{activePage === "challenges" && (
  <div className="space-y-8">

    {/* Choose Challenge */}
    <section>
      <h2 className="text-xl font-bold mb-4">
        Choose Challenge
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          "Logic Puzzles",
          "Memory Challenge",
          "Word Games",
          "Pattern Recognition",
          "Math Problems",
          "Riddles",
          "Quick Quiz",
        ].map((challenge) => (
          <button
            key={challenge}
            onClick={() => setSelectedChallenge(challenge)}
            className={`p-4 rounded-2xl border transition ${
              selectedChallenge === challenge
                ? "bg-blue-600 border-blue-500 text-white"
                : appearance === "Light"
                  ? "bg-white border-gray-200 text-gray-900 hover:border-blue-500"
                  : "bg-slate-900 border-slate-800 text-white hover:border-blue-500"
            }`}
          >
            <div className="text-2xl mb-2">
              {challenge === "Logic Puzzles" && "🧩"}
              {challenge === "Memory Challenge" && "🧠"}
              {challenge === "Word Games" && "🔤"}
              {challenge === "Pattern Recognition" && "🔷"}
              {challenge === "Math Problems" && "➗"}
              {challenge === "Riddles" && "❓"}
              {challenge === "Quick Quiz" && "⚡"}
            </div>

            <div className="text-sm font-semibold">
              {challenge}
            </div>
          </button>
        ))}
      </div>
    </section>

    {/* Difficulty */}
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-4">
        Difficulty
      </h2>

      <div className="flex flex-wrap gap-3">
        {[
          "Beginner",
          "Easy",
          "Medium",
          "Hard",
          "Expert",
        ].map((difficulty) => (
          <button
            key={difficulty}
            onClick={() => setSelectedDifficulty(difficulty)}
            className={`px-6 py-3 rounded-xl border ${
              selectedDifficulty === difficulty
                ? "bg-purple-600 border-purple-500 text-white"
                : appearance === "Light"
                  ? "bg-white border-gray-200 text-gray-900 hover:border-purple-500"
                  : "bg-slate-900 border-slate-800 text-white hover:border-purple-500"
            }`}
          >
            {difficulty}
          </button>
        ))}
      </div>
    </section>

    {/* Cognitive Challenge Engine */}
    <section id="challenges" className="mt-10">
      <div
        className={`border rounded-3xl p-6 ${
          appearance === "Light"
            ? "bg-white border-gray-200 text-gray-900"
            : "bg-slate-900 border-slate-800 text-white"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              🧠 Cognitive Challenge Engine
            </h2>

            <p className={`mt-1 ${
              appearance === "Light" ? "text-gray-600" : "text-slate-400"
            }`}>
              Challenges are generated and evaluated by the FastAPI backend.
            </p>
          </div>

          <button
            onClick={handleGenerateBackendChallenge}
            disabled={challengeLoading}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 font-semibold text-white"
          >
            {challengeLoading ? "Generating..." : "✨ Generate New Challenge"}
          </button>
        </div>

        {/* Challenge Information */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Challenge Type", value: selectedChallenge },
            { label: "Difficulty", value: selectedDifficulty },
            {
              label: "Challenge ID",
              value: backendChallenge?.challenge_id || "—",
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl p-4 ${
                appearance === "Light"
                  ? "bg-gray-100"
                  : "bg-slate-800"
              }`}
            >
              <p className={`text-sm ${
                appearance === "Light" ? "text-gray-600" : "text-slate-400"
              }`}>
                {item.label}
              </p>

              <p className="font-semibold mt-1">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Backend Challenge */}
        {backendChallenge ? (
          <div
            className={`rounded-2xl p-6 ${
              appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
            }`}
          >
            <p className={`text-sm mb-2 ${
              appearance === "Light" ? "text-gray-600" : "text-slate-400"
            }`}>
              Question
            </p>

            <h3 className="text-2xl font-bold leading-relaxed">
              {backendChallenge.question}
            </h3>

            <input
              value={backendAnswer}
              onChange={(e) => setBackendAnswer(e.target.value)}
              placeholder="Enter your answer"
              className={`w-full mt-6 px-4 py-3 rounded-xl border outline-none focus:border-blue-500 ${
                appearance === "Light"
                  ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  : "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
              }`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmitBackendAnswer();
                }
              }}
            />

            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleSubmitBackendAnswer}
                disabled={challengeSubmitting}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold text-white"
              >
                {challengeSubmitting ? "Checking..." : "Submit Answer"}
              </button>

              <button
                onClick={handleVerifyWakeUp}
                disabled={challengeSubmitting}
                className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 font-semibold text-white"
              >
                Verify Wake-Up
              </button>
            </div>

            {backendResult && (
              <p className="mt-5 text-blue-500 font-semibold">
                {backendResult}
              </p>
            )}
          </div>
        ) : (
          <div
            className={`rounded-2xl p-8 text-center ${
              appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
            }`}
          >
            <p className={
              appearance === "Light" ? "text-gray-600" : "text-slate-400"
            }>
              Click “Generate New Challenge” to get a challenge from the backend.
            </p>
          </div>
        )}

        {/* Alarm Challenge */}
        <div
          className={`rounded-2xl p-6 mt-6 ${
            appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
          }`}
        >
          <h3 className="text-xl font-semibold mb-4">
            ⏰ Alarm Challenge
          </h3>

          <p className={`mb-4 ${
            appearance === "Light" ? "text-gray-600" : "text-slate-400"
          }`}>
            Select a saved alarm to load its linked challenge.
          </p>

          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={selectedAlarmId}
              onChange={(e) => setSelectedAlarmId(e.target.value)}
              className={`flex-1 px-4 py-3 rounded-xl border ${
                appearance === "Light"
                  ? "bg-white border-gray-300 text-gray-900"
                  : "bg-slate-900 border-slate-700 text-white"
              }`}
            >
              <option value="">Select an alarm</option>

              {alarms.map((alarm) => (
                <option key={alarm[0]} value={alarm[0]}>
                  {alarm[3]} — {formatAlarmTime(alarm[2])}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleLoadAlarmChallenge(selectedAlarmId)}
              disabled={!selectedAlarmId}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold text-white"
            >
              Load Challenge
            </button>

            <button
              onClick={handleLinkChallengeToAlarm}
              disabled={!selectedAlarmId || !backendChallenge}
              className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 font-semibold text-white"
            >
              Link Current Challenge
            </button>
          </div>

          {alarmChallengeMessage && (
            <p className="mt-4 text-green-500 font-semibold">
              {alarmChallengeMessage}
            </p>
          )}
        </div>
      </div>
    </section>


{/* Mini Games */}
<section className="mt-10">
  <div
    className={`border rounded-3xl p-6 ${
      appearance === "Light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-slate-900 border-slate-800 text-white"
    }`}
  >
    {selectedChallenge === "Logic Puzzles" && (
      <SlidingPuzzle difficulty={selectedDifficulty} />
    )}

    {selectedChallenge === "Memory Challenge" && (
      <MemoryGame difficulty={selectedDifficulty} />
    )}

    {selectedChallenge === "Word Games" && (
      <WordScramble difficulty={selectedDifficulty} />
    )}

    {selectedChallenge === "Pattern Recognition" && (
      <PatternGame difficulty={selectedDifficulty} />
    )}

    {selectedChallenge === "Math Problems" && (
      <MathGame difficulty={selectedDifficulty} />
    )}

    {selectedChallenge === "Riddles" && (
      <RiddleGame
        difficulty={selectedDifficulty}
        appearance={appearance}
      />
    )}

    {selectedChallenge === "Quick Quiz" && (
      <QuizGame
        difficulty={selectedDifficulty}
        appearance={appearance}
      />
    )}
  </div>
</section>
</div>
)}



{activePage === "analytics" && (
  <div className="space-y-6">

    {/* Challenge Analytics */}
    <section
      className={`border rounded-3xl p-6 ${
        appearance === "Light"
          ? "bg-white border-gray-200 text-gray-900"
          : "bg-slate-900 border-slate-800 text-white"
      }`}
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            📊 Challenge Analytics
          </h2>
          <p className={`text-sm mt-1 ${
            appearance === "Light" ? "text-gray-600" : "text-slate-400"
          }`}>
            Your backend-recorded cognitive challenge performance.
          </p>
        </div>

        <button
          onClick={loadChallengeAnalytics}
          className={`px-4 py-2 rounded-xl text-sm ${
            appearance === "Light"
              ? "bg-gray-200 text-gray-900 hover:bg-gray-300"
              : "bg-slate-700 text-white hover:bg-slate-600"
          }`}
        >
          Refresh
        </button>
      </div>

      {analytics ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`rounded-xl p-4 ${
            appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
          }`}>
            <p className={`text-sm ${
              appearance === "Light" ? "text-gray-600" : "text-slate-400"
            }`}>Attempts</p>
            <p className="text-2xl font-bold mt-1">
              {analytics.total_attempts}
            </p>
          </div>

          <div className={`rounded-xl p-4 ${
            appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
          }`}>
            <p className={`text-sm ${
              appearance === "Light" ? "text-gray-600" : "text-slate-400"
            }`}>Correct</p>
            <p className="text-2xl font-bold text-green-500 mt-1">
              {analytics.correct_answers}
            </p>
          </div>

          <div className={`rounded-xl p-4 ${
            appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
          }`}>
            <p className={`text-sm ${
              appearance === "Light" ? "text-gray-600" : "text-slate-400"
            }`}>Wrong</p>
            <p className="text-2xl font-bold text-red-500 mt-1">
              {analytics.wrong_answers}
            </p>
          </div>

          <div className={`rounded-xl p-4 ${
            appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
          }`}>
            <p className={`text-sm ${
              appearance === "Light" ? "text-gray-600" : "text-slate-400"
            }`}>Accuracy</p>
            <p className="text-2xl font-bold text-blue-500 mt-1">
              {analytics.accuracy_percentage}%
            </p>
          </div>
        </div>
      ) : (
        <p className={appearance === "Light" ? "text-gray-600" : "text-slate-400"}>
          No challenge analytics available yet.
        </p>
      )}

      {/* Performance by Type */}
      {typeAnalytics.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className={`font-semibold ${
            appearance === "Light" ? "text-gray-700" : "text-slate-300"
          }`}>
            Performance by Type
          </p>

          {typeAnalytics.map((item) => (
            <div
              key={item.challenge_type}
              className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
              }`}
            >
              <span>{item.challenge_type}</span>
              <span className="text-blue-500">
                {item.accuracy_percentage}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Challenge Performance Chart */}
      {typeAnalytics.length > 0 && (
        <div className="mt-6">
          <p className={`font-semibold mb-3 ${
            appearance === "Light" ? "text-gray-700" : "text-slate-300"
          }`}>
            📊 Challenge Performance
          </p>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={typeAnalytics}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={appearance === "Light" ? "#d1d5db" : "#334155"}
                />

                <XAxis
                  dataKey="challenge_type"
                  tick={{ fill: appearance === "Light" ? "#374151" : "#cbd5e1" }}
                />

                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: appearance === "Light" ? "#374151" : "#cbd5e1" }}
                />

                <Tooltip
                  formatter={(value) => [`${value}%`, "Accuracy"]}
                  contentStyle={{
                    backgroundColor: appearance === "Light" ? "#ffffff" : "#0f172a",
                    borderColor: appearance === "Light" ? "#d1d5db" : "#334155",
                    color: appearance === "Light" ? "#111827" : "#ffffff",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="accuracy_percentage"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>

    {/* Behavioral Analytics Engine */}
    <section
      className={`border rounded-3xl p-6 ${
        appearance === "Light"
          ? "bg-white border-gray-200 text-gray-900"
          : "bg-slate-900 border-slate-800 text-white"
      }`}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          🧠 Behavioral Analytics Engine
        </h2>
        <p className={`mt-1 ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}>
          Monitor snooze behavior, wake-up consistency, productivity context and sleep patterns.
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Snooze Pattern */}
        <div className={`rounded-2xl p-5 ${
          appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
        }`}>
          <p className={`text-sm ${
            appearance === "Light" ? "text-gray-600" : "text-slate-400"
          }`}>
            😴 Snooze Pattern Analysis
          </p>
          <p className="text-2xl font-bold mt-2">
            {Object.values(alarmSettings).reduce(
              (sum, a) => sum + Number(a.snooze_count || 0), 0
            )} snoozes
          </p>
          <p className={`text-sm mt-2 ${
            appearance === "Light" ? "text-gray-600" : "text-slate-500"
          }`}>
            Tracked snoozes / configured limits across saved alarms.
          </p>
        </div>

        {/* Wake-up Behavior */}
        <div className={`rounded-2xl p-5 ${
          appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
        }`}>
          <p className={`text-sm ${
            appearance === "Light" ? "text-gray-600" : "text-slate-400"
          }`}>
            ⏰ Wake-up Behavior Tracking
          </p>
          <p className="text-2xl font-bold mt-2">
            {alarms.filter((a) => a[4]).length} active alarms
          </p>
          <p className={`text-sm mt-2 ${
            appearance === "Light" ? "text-gray-600" : "text-slate-500"
          }`}>
            Active wake-up schedules currently registered.
          </p>
        </div>

        {/* Productivity Correlation */}
        <div className={`rounded-2xl p-5 ${
          appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
        }`}>
          <p className={`text-sm ${
            appearance === "Light" ? "text-gray-600" : "text-slate-400"
          }`}>
            📈 Productivity Correlation Analysis
          </p>
          <p className="text-2xl font-bold mt-2">
            {analytics
              ? `${analytics.accuracy_percentage}% challenge accuracy`
              : "No data yet"}
          </p>
          <p className={`text-sm mt-2 ${
            appearance === "Light" ? "text-gray-600" : "text-slate-500"
          }`}>
            Challenge performance shown alongside your productivity goal; correlation requires recorded history.
          </p>
        </div>

        {/* Habit Consistency */}
        <div className={`rounded-2xl p-5 ${
          appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
        }`}>
          <p className={`text-sm ${
            appearance === "Light" ? "text-gray-600" : "text-slate-400"
          }`}>
            🔁 Habit Consistency Monitoring
          </p>
          <p className="text-2xl font-bold mt-2">
            {alarms.length} schedules
          </p>
          <p className={`text-sm mt-2 ${
            appearance === "Light" ? "text-gray-600" : "text-slate-500"
          }`}>
            Consistency tracking is based on saved recurring alarm schedules and future wake-up events.
          </p>
        </div>

        {/* Sleep Pattern */}
        <div className={`rounded-2xl p-5 ${
          appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
        }`}>
          <p className={`text-sm ${
            appearance === "Light" ? "text-gray-600" : "text-slate-400"
          }`}>
            🌙 Sleep Pattern Analytics
          </p>
          <p className="text-2xl font-bold mt-2">
            {Math.floor(Number(sleepDurationMinutes || 0) / 60)}h{" "}
            {Number(sleepDurationMinutes || 0) % 60}m
          </p>
          <p className={`text-sm mt-2 ${
            appearance === "Light" ? "text-gray-600" : "text-slate-500"
          }`}>
            Configured sleep duration and sleep/wake preferences.
          </p>
        </div>

        {/* Time Zone */}
        <div className={`rounded-2xl p-5 ${
          appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
        }`}>
          <p className={`text-sm ${
            appearance === "Light" ? "text-gray-600" : "text-slate-400"
          }`}>
            🌍 Time Zone
          </p>
          <p className="text-2xl font-bold mt-2 break-words">
            {timeZone}
          </p>
          <p className={`text-sm mt-2 ${
            appearance === "Light" ? "text-gray-600" : "text-slate-500"
          }`}>
            Used for interpreting your sleep and alarm schedule.
          </p>
        </div>
      </div>

      {/* Productivity Goal */}
      <div className={`mt-6 rounded-2xl p-5 ${
        appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
      }`}>
        <p className="font-semibold">Productivity Goal</p>
        <p className={`mt-2 ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}>
          {productivityGoals || "No productivity goal configured yet."}
        </p>
      </div>
    </section>
  </div>
)}

        {activePage === "habits" && (
          <div className="space-y-6">
            <section
  className={`border rounded-3xl p-6 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">🎯 Habit Tracking Dashboard</h2>
                  <p className={`mt-1 ${appearance === "Light" ? "text-gray-600" : "text-slate-400"}`}>
  Your M3 adaptive intelligence, habit score and personalized recommendations.
</p>
                </div>
                <button onClick={loadM3Dashboard} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold">
                  {m3Loading ? "Refreshing..." : "Refresh M3 Data"}
                </button>
                <div className="flex gap-3">


  <button
    onClick={exportAnalyticsReport}
    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 font-semibold"
  >
    📊 Export Report
  </button>
  <button
  onClick={exportExcelReport}
  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold"
>
  📗 Export Excel
</button>
</div>
              </div>
              {m3Message && <p className="text-red-400 mt-4">{m3Message}</p>}
            </section>


{/* Premium Habit Score Overview */}
<section className="grid grid-cols-1 xl:grid-cols-3 gap-5">

  {/* Overall Score Card */}
  <div
    className={`relative overflow-hidden border rounded-3xl p-6 ${
      appearance === "Light"
        ? "bg-white border-gray-200"
        : "bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border-slate-700"
    }`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm font-medium ${
          appearance === "Light" ? "text-gray-500" : "text-slate-400"
        }`}>
          YOUR HABIT SCORE
        </p>

        <h3 className="text-2xl font-bold mt-2">Overall Progress</h3>
        <p className={`text-sm mt-2 ${
          appearance === "Light" ? "text-gray-500" : "text-slate-400"
        }`}>
          Your overall habit performance
        </p>
      </div>

      <span className="text-3xl">🎯</span>
    </div>

    <div className="flex justify-center items-center py-7">
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="66"
            fill="none"
            stroke={appearance === "Light" ? "#e5e7eb" : "#263449"}
            strokeWidth="12"
          />

          <circle
            cx="80"
            cy="80"
            r="66"
            fill="none"
            stroke="#818cf8"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 66}`}
            strokeDashoffset={`${
              2 * Math.PI * 66 *
              (1 - Math.max(0, Math.min(100, Number(habitScore?.overall_score ?? 0))) / 100)
            }`}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold">
            {Number(habitScore?.overall_score ?? 0).toFixed(2)}
          </span>
          <span className={`text-sm mt-1 ${
            appearance === "Light" ? "text-gray-500" : "text-slate-400"
          }`}>
            out of 100
          </span>
        </div>
      </div>
    </div>

    <div className={`text-center rounded-2xl py-3 ${
      appearance === "Light" ? "bg-indigo-50" : "bg-indigo-500/10"
    }`}>
      <p className="text-indigo-500 font-semibold">
        ✨ Habit improvement tracker
      </p>
    </div>
  </div>

  {/* Four Habit Metrics */}
  <div
    className={`xl:col-span-2 border rounded-3xl p-6 ${
      appearance === "Light"
        ? "bg-white border-gray-200"
        : "bg-slate-900 border-slate-800"
    }`}
  >
    <div className="mb-6">
      <h3 className="text-xl font-bold">Habit Performance</h3>
      <p className={`text-sm mt-1 ${
        appearance === "Light" ? "text-gray-500" : "text-slate-400"
      }`}>
        Track your progress across four important habits.
      </p>
    </div>

    {[
      {
        label: "Wake-up Consistency",
        value: habitScore?.wake_up_consistency ?? 0,
        color: "bg-indigo-500",
        icon: "🌅",
      },
      {
        label: "Challenge Success",
        value: habitScore?.challenge_success ?? 0,
        color: "bg-purple-500",
        icon: "🧠",
      },
      {
        label: "Snooze Reduction",
        value: habitScore?.snooze_reduction ?? 0,
        color: "bg-blue-500",
        icon: "⏰",
      },
      {
        label: "Sleep Adherence",
        value: habitScore?.sleep_adherence ?? 0,
        color: "bg-cyan-500",
        icon: "🌙",
      },
    ].map((metric) => {
      const value = Math.max(
        0,
        Math.min(100, Number(metric.value) || 0)
      );

      return (
        <div key={metric.label} className="mb-6 last:mb-0">
          <div className="flex justify-between items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{metric.icon}</span>
              <span className="font-medium">{metric.label}</span>
            </div>

            <span className="font-bold tabular-nums">
              {Number(metric.value || 0).toFixed(2)}%
            </span>
          </div>

          <div className={`h-3 rounded-full overflow-hidden ${
            appearance === "Light" ? "bg-gray-100" : "bg-slate-800"
          }`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${metric.color}`}
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      );
    })}
  </div>

</section>



{/* M4 - AI ADAPTIVE DIFFICULTY */}
<section
  className={`border rounded-3xl p-6 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <h2 className="text-2xl font-bold">
        🤖 AI Adaptive Difficulty
      </h2>
      <p
        className={`mt-1 ${
          appearance === "Light"
            ? "text-gray-600"
            : "text-slate-400"
        }`}
      >
        Machine-learning based challenge difficulty recommendation from your behavior.
      </p>
    </div>

    <button
      onClick={loadMLPrediction}
      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition"
      disabled={mlLoading}
    >
      {mlLoading ? "Analyzing..." : "Refresh AI Prediction"}
    </button>
  </div>

  {mlError && (
    <p className="text-red-500 mt-4">
      {mlError}
    </p>
  )}

  {mlPrediction && (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      <div
        className={`rounded-2xl p-5 border ${
          appearance === "Light"
            ? "bg-gray-50 border-gray-200"
            : "bg-slate-800 border-slate-700"
        }`}
      >
        <p className={appearance === "Light" ? "text-gray-600 text-sm" : "text-slate-400 text-sm"}>
          Recommended Difficulty
        </p>
        <p className="text-2xl font-bold text-purple-500 mt-2">
          {mlPrediction.ml_prediction.difficulty}
        </p>
      </div>

      <div
        className={`rounded-2xl p-5 border ${
          appearance === "Light"
            ? "bg-gray-50 border-gray-200"
            : "bg-slate-800 border-slate-700"
        }`}
      >
        <p className={appearance === "Light" ? "text-gray-600 text-sm" : "text-slate-400 text-sm"}>
          Prediction Confidence
        </p>
        <p className="text-2xl font-bold text-cyan-500 mt-2">
          {mlPrediction.ml_prediction.confidence}%
        </p>
      </div>

      <div
        className={`rounded-2xl p-5 border ${
          appearance === "Light"
            ? "bg-gray-50 border-gray-200"
            : "bg-slate-800 border-slate-700"
        }`}
      >
        <p className={appearance === "Light" ? "text-gray-600 text-sm" : "text-slate-400 text-sm"}>
          Challenge Accuracy
        </p>
        <p className="text-2xl font-bold text-green-500 mt-2">
          {mlPrediction.input_data.accuracy}%
        </p>
      </div>

      <div
        className={`rounded-2xl p-5 border ${
          appearance === "Light"
            ? "bg-gray-50 border-gray-200"
            : "bg-slate-800 border-slate-700"
        }`}
      >
        <p className={appearance === "Light" ? "text-gray-600 text-sm" : "text-slate-400 text-sm"}>
          Snoozes
        </p>
        <p className="text-2xl font-bold text-yellow-500 mt-2">
          {mlPrediction.input_data.snoozes}
        </p>
      </div>
    </div>
  )}
</section>

<section className="grid lg:grid-cols-2 gap-6">




<div
  className={`border rounded-3xl p-6 ${
    appearance === "Light"
      ? "bg-white border-gray-200 text-gray-900"
      : "bg-slate-900 border-slate-800 text-white"
  }`}
>
  <h3 className="text-xl font-bold mb-4">
    📈 Habit Score History
  </h3>

  {habitHistory.length === 0 ? (
    <p
      className={
        appearance === "Light"
          ? "text-gray-600"
          : "text-slate-400"
      }
    >
      No habit score history yet.
    </p>
  ) : (
    <>




{/* Premium Habit Score Trend Chart */}
<div
  className={`w-full h-80 rounded-2xl p-3 mb-6 border ${
    appearance === "Light"
      ? "bg-gray-50 border-gray-200"
      : "bg-slate-950/60 border-slate-800"
  }`}
>
  <div className="flex items-center justify-between px-2 pt-2 mb-2">
    <div>
      <p className="font-semibold">Score Trend</p>
      <p className={`text-xs mt-1 ${
        appearance === "Light" ? "text-gray-500" : "text-slate-400"
      }`}>
        Your habit performance over time
      </p>
    </div>

    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400">
      Out of 100
    </span>
  </div>

  <ResponsiveContainer width="100%" height="82%">
    <AreaChart
      data={[...habitHistory].slice(0, 10).reverse()}
      margin={{ top: 12, right: 12, left: -15, bottom: 4 }}
    >
      <defs>
        <linearGradient id="habitScoreGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#818cf8" stopOpacity={0.02} />
        </linearGradient>
      </defs>

      <CartesianGrid
        strokeDasharray="3 5"
        vertical={false}
        stroke={appearance === "Light" ? "#e5e7eb" : "#293548"}
      />

      <XAxis
        dataKey="created_at"
        tickFormatter={(value) =>
          new Date(value).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        }
        tick={{ fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        stroke={appearance === "Light" ? "#6b7280" : "#94a3b8"}
      />

      <YAxis
        domain={[0, 100]}
        ticks={[0, 25, 50, 75, 100]}
        tick={{ fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        stroke={appearance === "Light" ? "#6b7280" : "#94a3b8"}
      />

      <Tooltip
        contentStyle={{
          backgroundColor: appearance === "Light" ? "#ffffff" : "#0f172a",
          border: `1px solid ${
            appearance === "Light" ? "#e5e7eb" : "#334155"
          }`,
          borderRadius: "12px",
          color: appearance === "Light" ? "#111827" : "#ffffff",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}
        labelFormatter={(value) => new Date(value).toLocaleString()}
        formatter={(value) => [`${value}/100`, "Habit Score"]}
      />

      <Area
        type="monotone"
        dataKey="overall_score"
        name="Habit Score"
        stroke="#818cf8"
        strokeWidth={3}
        fill="url(#habitScoreGradient)"
        connectNulls
        activeDot={{ r: 6, strokeWidth: 2, stroke: "#ffffff" }}
      />
    </AreaChart>
  </ResponsiveContainer>
</div>


{/* History List */}
<div className="space-y-3 max-h-80 overflow-y-auto">
  {habitHistory.slice(0, 10).map((item) => (
    <div
      key={item.id}
      className={`rounded-2xl p-4 border ${
        appearance === "Light"
          ? "bg-gray-50 border-gray-200"
          : "bg-slate-800 border-slate-700"
      }`}
    >
      <div className="flex justify-between items-center gap-3">
        <span
          className={`text-sm ${
            appearance === "Light" ? "text-gray-600" : "text-slate-300"
          }`}
        >
          {new Date(item.created_at).toLocaleString()}
        </span>

        <span className="font-bold text-yellow-500">
          {item.overall_score}/100
        </span>
      </div>

      <div
        className={`grid grid-cols-2 gap-2 mt-3 text-xs ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}
      >
        <span>Wake-up: {item.wake_up_consistency}%</span>
        <span>Challenge: {item.challenge_success}%</span>
        <span>Snooze: {item.snooze_reduction}%</span>
        <span>Sleep: {item.sleep_adherence}%</span>
      </div>
    </div>
  ))}
</div>
</>
)}
</div>
</section>



<section className="grid lg:grid-cols-2 gap-6">
  {/* Adaptive Difficulty History */}
  <div
    className={`border rounded-3xl p-6 ${
      appearance === "Light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-slate-900 border-slate-800 text-white"
    }`}
  >
    <h3 className="text-xl font-bold mb-4">
      🧠 Adaptive Difficulty History
    </h3>

    {adaptiveHistory.length === 0 ? (
      <p className={appearance === "Light" ? "text-gray-600" : "text-slate-400"}>
        No adaptive difficulty records yet.
      </p>
    ) : (
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {adaptiveHistory.slice(0, 10).map((item, index) => (
          <div
            key={item.id || item.record_id || index}
            className={`rounded-2xl p-4 flex items-center justify-between gap-4 border ${
              appearance === "Light"
                ? "bg-gray-50 border-gray-200"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            <div>
              <p className="font-semibold">
                {item.challenge_type || "Challenge"}
              </p>
              <p className={`text-sm ${appearance === "Light" ? "text-gray-600" : "text-slate-400"}`}>
                Accuracy: {item.accuracy ?? item.performance ?? "—"}%
              </p>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                appearance === "Light"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-purple-500/20 text-purple-300"
              }`}
            >
              {item.new_difficulty || "—"}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>

  {/* Behavioral Activity */}
  <div
    className={`border rounded-3xl p-6 ${
      appearance === "Light"
        ? "bg-white border-gray-200 text-gray-900"
        : "bg-slate-900 border-slate-800 text-white"
    }`}
  >
    <h3 className="text-xl font-bold mb-4">
      📝 Behavioral Activity
    </h3>

    <div className="grid grid-cols-2 gap-3 mb-4">
      <div
        className={`rounded-xl p-4 ${
          appearance === "Light" ? "bg-gray-50" : "bg-slate-800"
        }`}
      >
        <p className={`text-sm ${appearance === "Light" ? "text-gray-600" : "text-slate-400"}`}>
          Recorded Events
        </p>
        <p className="text-2xl font-bold mt-1">
          {behavioralEvents.length}
        </p>
      </div>

      <div
        className={`rounded-xl p-4 ${
          appearance === "Light" ? "bg-gray-50" : "bg-slate-800"
        }`}
      >
        <p className={`text-sm ${appearance === "Light" ? "text-gray-600" : "text-slate-400"}`}>
          Recommendations
        </p>
        <p className="text-2xl font-bold mt-1">
          {recommendations.length}
        </p>
        </div>
    </div>

    {behavioralEvents.length > 0 && (
      <div className="mb-5">
        <p className={`font-semibold mb-3 ${appearance === "Light" ? "text-gray-700" : "text-slate-300"}`}>
          📊 Behavioral Event Trend
        </p>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={Object.values(
                behavioralEvents.reduce((acc, event) => {
                  const type = event.event_type;

                  if (!acc[type]) {
                    acc[type] = {
                      event_type: type,
                      count: 0,
                    };
                  }

                  acc[type].count += 1;
                  return acc;
                }, {})
              )}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={appearance === "Light" ? "#d1d5db" : "#334155"}
              />

              <XAxis
                dataKey="event_type"
                stroke={appearance === "Light" ? "#4b5563" : "#cbd5e1"}
              />

              <YAxis
                allowDecimals={false}
                stroke={appearance === "Light" ? "#4b5563" : "#cbd5e1"}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: appearance === "Light" ? "#ffffff" : "#0f172a",
                  border: `1px solid ${appearance === "Light" ? "#d1d5db" : "#334155"}`,
                  borderRadius: "12px",
                  color: appearance === "Light" ? "#111827" : "#ffffff",
                }}
              />

              <Line
                type="monotone"
                dataKey="count"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )}

{behavioralEvents.length > 0 ? (
  <div className="space-y-2 max-h-48 overflow-y-auto">
    {behavioralEvents.slice(0, 8).map((event) => (
      <div
        key={event.event_id}
        className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 border ${
          appearance === "Light"
            ? "bg-gray-50 border-gray-200"
            : "bg-slate-800 border-slate-700"
        }`}
      >
        <span className="text-sm">
          {event.event_type}
        </span>

        <span
          className={`text-xs ${
            appearance === "Light"
              ? "text-gray-500"
              : "text-slate-400"
          }`}
        >
          {new Date(event.event_time).toLocaleString()}
        </span>
      </div>
    ))}
  </div>
) : (
  <p
    className={`text-sm ${
      appearance === "Light"
        ? "text-gray-600"
        : "text-slate-400"
    }`}
  >
    No behavioral events recorded yet.
  </p>
)}
</div>
</section>
</div>
)}






{activePage === "recommendations" && (
  <div className="space-y-6">

    {/* Personalized Recommendations Header */}
    <section
      className={`border rounded-3xl p-6 ${
        appearance === "Light"
          ? "bg-white border-gray-200 text-gray-900"
          : "bg-slate-900 border-slate-800 text-white"
      }`}
    >
      <h2 className="text-2xl font-bold">
        💡 Personalized Recommendations
      </h2>

      <p
        className={`mt-2 ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}
      >
        Suggestions generated from your alarm behavior, challenge performance and habits.
      </p>
    </section>

    {/* Recommendation Statistics */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* Total Recommendations */}
      <div
        className={`border rounded-2xl p-5 ${
          appearance === "Light"
            ? "bg-white border-gray-200 text-gray-900"
            : "bg-slate-900 border-slate-800 text-white"
        }`}
      >
        <p className={`text-sm ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}>
          Total Recommendations
        </p>

        <p className="text-3xl font-bold mt-2">
          {recommendations.length}
        </p>
      </div>

      {/* Completed */}
      <div
        className={`border rounded-2xl p-5 ${
          appearance === "Light"
            ? "bg-white border-gray-200 text-gray-900"
            : "bg-slate-900 border-slate-800 text-white"
        }`}
      >
        <p className={`text-sm ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}>
          Completed
        </p>

        <p className="text-3xl font-bold text-green-500 mt-2">
          {recommendations.filter((item) => item.is_completed).length}
        </p>
      </div>

      {/* Pending */}
      <div
        className={`border rounded-2xl p-5 ${
          appearance === "Light"
            ? "bg-white border-gray-200 text-gray-900"
            : "bg-slate-900 border-slate-800 text-white"
        }`}
      >
        <p className={`text-sm ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}>
          Pending
        </p>

        <p className="text-3xl font-bold text-yellow-500 mt-2">
          {recommendations.filter((item) => !item.is_completed).length}
        </p>
      </div>

    </div>



    {/* Recommendation List */}
    <section className="grid gap-4">

      {recommendations.length === 0 ? (
        <div
          className={`border rounded-3xl p-6 ${
            appearance === "Light"
              ? "bg-white border-gray-200 text-gray-900"
              : "bg-slate-900 border-slate-800 text-white"
          }`}
        >
          <p className={
            appearance === "Light" ? "text-gray-600" : "text-slate-400"
          }>
            No recommendations available yet.
          </p>
        </div>

) : (
        [...recommendations]
          .sort(
            (a, b) =>
              new Date(b.created_at) - new Date(a.created_at)
          )
          .filter(
            (item, index, array) =>
              array.findIndex(
                (other) => other.type === item.type
              ) === index
          )
          .map((item) => (

          <div
            key={item.id}
            className={`border rounded-3xl p-6 ${
              appearance === "Light"
                ? "bg-white border-gray-200 text-gray-900"
                : "bg-slate-900 border-slate-800 text-white"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">

                  <h3 className="text-lg font-bold">
                    {item.type}
                  </h3>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.priority === "High"
                        ? "bg-red-500/20 text-red-500"
                        : "bg-yellow-500/20 text-yellow-600"
                    }`}
                  >
                    {item.priority}
                  </span>

                </div>

                <p className={
                  appearance === "Light" ? "text-gray-600" : "text-slate-400"
                }>
                  {item.text}
                </p>
              </div>

              {item.is_completed ? (
                <span className="px-4 py-2 rounded-xl bg-green-500/20 text-green-600 font-semibold whitespace-nowrap">
                  ✓ Completed
                </span>
              ) : (
                <button
                  onClick={() => handleCompleteRecommendation(item.id)}
                  className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold whitespace-nowrap"
                >
                  ✓ Mark Completed
                </button>
              )}

            </div>
          </div>
        ))
      )}

    </section>

  </div>
)}




{activePage === "profile" && (
  <div className="space-y-6">

    <section
      className={`border rounded-3xl p-8 max-w-4xl mx-auto ${
        appearance === "Light"
          ? "bg-white border-gray-200 text-gray-900"
          : "bg-slate-900 border-slate-800 text-white"
      }`}
    >
      {/* Profile Header */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto rounded-full bg-blue-600 flex items-center justify-center text-4xl font-bold text-white">
          J
        </div>

        <h2 className="text-3xl font-bold mt-4">
          User Profile
        </h2>

        <p className={`mt-2 ${
          appearance === "Light" ? "text-gray-600" : "text-slate-400"
        }`}>
          Manage your sleep and cognitive preferences
        </p>
      </div>

      <form onSubmit={handleSaveProfile}>
        <div className="grid md:grid-cols-2 gap-6">

          {/* Wake-up Time */}
          <div>
            <label className={`block mb-2 ${
              appearance === "Light" ? "text-gray-700" : "text-slate-300"
            }`}>
              Wake-up Time
            </label>

            <input
              type="time"
              value={wakeUpTime}
              onChange={(e) => setWakeUpTime(e.target.value)}
              required
              className={`w-full px-4 py-3 rounded-xl border outline-none ${
                appearance === "Light"
                  ? "bg-white border-gray-300 text-gray-900"
                  : "bg-slate-800 border-slate-700 text-white"
              }`}
            />
          </div>

          {/* Sleep Time */}
          <div>
            <label className={`block mb-2 ${
              appearance === "Light" ? "text-gray-700" : "text-slate-300"
            }`}>
              Sleep Time
            </label>

            <input
              type="time"
              value={sleepTime}
              onChange={(e) => setSleepTime(e.target.value)}
              required
              className={`w-full px-4 py-3 rounded-xl border outline-none ${
                appearance === "Light"
                  ? "bg-white border-gray-300 text-gray-900"
                  : "bg-slate-800 border-slate-700 text-white"
              }`}
            />
          </div>

          {/* Sleep Duration */}
          <div>
            <label className={`block mb-2 ${
              appearance === "Light" ? "text-gray-700" : "text-slate-300"
            }`}>
              Sleep Duration (minutes)
            </label>

            <input
              type="number"
              min="0"
              max="1440"
              value={sleepDurationMinutes}
              onChange={(e) => setSleepDurationMinutes(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border outline-none ${
                appearance === "Light"
                  ? "bg-white border-gray-300 text-gray-900"
                  : "bg-slate-800 border-slate-700 text-white"
              }`}
            />
          </div>

          {/* Time Zone */}
          <div>
            <label className={`block mb-2 ${
              appearance === "Light" ? "text-gray-700" : "text-slate-300"
            }`}>
              Time Zone
            </label>

            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border outline-none ${
                appearance === "Light"
                  ? "bg-white border-gray-300 text-gray-900"
                  : "bg-slate-800 border-slate-700 text-white"
              }`}
            >
              <option>Asia/Kolkata</option>
              <option>Asia/Dubai</option>
              <option>Asia/Singapore</option>
              <option>Europe/London</option>
              <option>America/New_York</option>
            </select>
          </div>
        </div>

        {/* Preferred Challenge Type */}
        <div className="mt-6">
          <label className={`block mb-2 ${
            appearance === "Light" ? "text-gray-700" : "text-slate-300"
          }`}>
            Preferred Challenge Type
          </label>

          <select
            value={preferredChallengeType}
            onChange={(e) => setPreferredChallengeType(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border outline-none ${
              appearance === "Light"
                ? "bg-white border-gray-300 text-gray-900"
                : "bg-slate-800 border-slate-700 text-white"
            }`}
          >
            <option>Logic Puzzles</option>
            <option>Memory Challenge</option>
            <option>Word Games</option>
            <option>Pattern Recognition</option>
            <option>Math Problems</option>
            <option>Riddles</option>
            <option>Quick Quiz</option>
          </select>
        </div>

        {/* Difficulty Preference */}
        <div className="mt-6">
          <label className={`block mb-2 ${
            appearance === "Light" ? "text-gray-700" : "text-slate-300"
          }`}>
            Difficulty Preference
          </label>

          <select
            value={preferredDifficulty}
            onChange={(e) => setPreferredDifficulty(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border outline-none ${
              appearance === "Light"
                ? "bg-white border-gray-300 text-gray-900"
                : "bg-slate-800 border-slate-700 text-white"
            }`}
          >
            <option>Beginner</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
            <option>Expert</option>
          </select>
        </div>

        {/* Productivity Goals */}
        <div className="mt-6">
          <label className={`block mb-2 ${
            appearance === "Light" ? "text-gray-700" : "text-slate-300"
          }`}>
            Productivity Goals
          </label>

          <textarea
            value={productivityGoals}
            onChange={(e) => setProductivityGoals(e.target.value)}
            rows="3"
            placeholder="Example: Study Python and prepare for placements"
            className={`w-full px-4 py-3 rounded-xl border outline-none resize-none ${
              appearance === "Light"
                ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                : "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            }`}
          />
        </div>

        {/* Habit Preferences */}
        <div className="mt-6">
          <label className={`block mb-2 ${
            appearance === "Light" ? "text-gray-700" : "text-slate-300"
          }`}>
            Habit Preferences
          </label>

          <textarea
            value={habitPreferences}
            onChange={(e) => setHabitPreferences(e.target.value)}
            rows="3"
            placeholder="Example: Wake up early and study in the morning"
            className={`w-full px-4 py-3 rounded-xl border outline-none resize-none ${
              appearance === "Light"
                ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                : "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            }`}
          />
        </div>

        {/* Save Profile */}
        <button
          type="submit"
          className="w-full mt-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
        >
          Save Profile
        </button>
      </form>

      {/* Profile Message */}
      {profileMessage && (
        <p className="text-center text-green-500 mt-5">
          {profileMessage}
        </p>
      )}
    </section>
  </div>
)}





{activePage === "settings" && (
  <div className="max-w-4xl mx-auto space-y-6">

    <section
      className={`border rounded-3xl p-8 ${
        appearance === "Light"
          ? "bg-white border-gray-200 text-gray-900"
          : "bg-slate-900 border-slate-800 text-white"
      }`}
    >
      <h2 className="text-2xl font-bold mb-2">
        ⚙️ App Settings
      </h2>

      <p
        className={`mb-8 ${
          appearance === "Light"
            ? "text-gray-600"
            : "text-slate-400"
        }`}
      >
        Personalize your Intelligent Cognitive Alarm experience.
      </p>

      <SettingsForm
        appearance={appearance}
        setAppearance={setAppearance}
      />
    </section>

  </div>
)}


      </main>




      </div>
    </div>
      </>
  );
}

/* =========================================================
   1. SLIDING PUZZLE
========================================================= */

function SlidingPuzzle({ difficulty }) {

  const getSize = () => {
    if (difficulty === "Beginner") return 3;
    if (difficulty === "Easy") return 3;
    if (difficulty === "Medium") return 4;
    if (difficulty === "Hard") return 4;
    return 5;
  };

  const size = getSize();

  const createPuzzle = () => {
    const total = size * size;

    const numbers = Array.from(
      { length: total - 1 },
      (_, i) => i + 1
    );

    numbers.push(0);

    return shuffleArray(numbers);
  };

  const [tiles, setTiles] = useState(createPuzzle);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  useEffect(() => {
    setTiles(createPuzzle());
    setMoves(0);
    setWon(false);
  }, [difficulty]);

  const moveTile = (index) => {

    if (won) return;

    const emptyIndex = tiles.indexOf(0);

    const row = Math.floor(index / size);
    const col = index % size;

    const emptyRow = Math.floor(
      emptyIndex / size
    );

    const emptyCol = emptyIndex % size;

    const isAdjacent =
      (Math.abs(row - emptyRow) === 1 &&
        col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 &&
        row === emptyRow);

    if (!isAdjacent) return;

    const newTiles = [...tiles];

    [newTiles[index], newTiles[emptyIndex]] =
      [newTiles[emptyIndex], newTiles[index]];

    setTiles(newTiles);
    setMoves((m) => m + 1);

    const solved = newTiles.every(
      (value, i) =>
        value === 0
          ? i === newTiles.length - 1
          : value === i + 1
    );

    if (solved) {
      setWon(true);
    }
  };

  const resetGame = () => {
    setTiles(createPuzzle());
    setMoves(0);
    setWon(false);
  };

  return (
    <div className="text-center">

      <h2 className="text-3xl font-bold mb-2">
        🧩 Sliding Puzzle
      </h2>

      <p className="text-slate-400 mb-6">
        Difficulty: {difficulty}
      </p>

      <div
        className="mx-auto grid gap-2 max-w-md"
        style={{
          gridTemplateColumns:
            `repeat(${size}, minmax(0, 1fr))`,
        }}
      >

        {tiles.map((tile, index) => (

          <button
            key={index}
            onClick={() => moveTile(index)}
            className={`aspect-square rounded-xl text-xl md:text-2xl font-bold ${
              tile === 0
                ? "bg-slate-800"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {tile !== 0 && tile}
          </button>

        ))}

      </div>

      <p className="mt-5 text-slate-300">
        Moves: {moves}
      </p>

      {won && (
        <p className="text-green-400 font-bold text-xl mt-4">
          🎉 Puzzle Solved!
        </p>
      )}

      <button
        onClick={resetGame}
        className="mt-5 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl"
      >
        New Puzzle
      </button>

    </div>
  );
}

/* =========================================================
   2. MEMORY GAME
========================================================= */

function MemoryGame({ difficulty }) {

  const getPairCount = () => {
    if (difficulty === "Beginner") return 3;
    if (difficulty === "Easy") return 4;
    if (difficulty === "Medium") return 6;
    if (difficulty === "Hard") return 8;
    return 10;
  };

  const symbols = [
    "🍎",
    "🍌",
    "🍇",
    "🍉",
    "🍓",
    "🍒",
    "🥝",
    "🍍",
    "🥭",
    "🍑",
  ];

  const createCards = () => {

    const pairCount = getPairCount();

    const selected = symbols.slice(0, pairCount);

    return shuffleArray([
      ...selected,
      ...selected,
    ]).map((symbol, index) => ({
      id: index,
      symbol,
      flipped: false,
      matched: false,
    }));
  };

  const [cards, setCards] = useState(createCards);
  const [first, setFirst] = useState(null);
  const [second, setSecond] = useState(null);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  useEffect(() => {
    setCards(createCards());
    setFirst(null);
    setSecond(null);
    setMoves(0);
    setWon(false);
  }, [difficulty]);

  useEffect(() => {

    if (first === null || second === null) return;

    const firstCard = cards[first];
    const secondCard = cards[second];

    setMoves((m) => m + 1);

    if (firstCard.symbol === secondCard.symbol) {

      setCards((current) =>
        current.map((card, index) =>
          index === first || index === second
            ? { ...card, matched: true }
            : card
        )
      );

      setFirst(null);
      setSecond(null);

    } else {

      setTimeout(() => {

        setCards((current) =>
          current.map((card, index) =>
            index === first || index === second
              ? { ...card, flipped: false }
              : card
          )
        );

        setFirst(null);
        setSecond(null);

      }, 700);
    }

  }, [second]);

  useEffect(() => {

    if (
      cards.length > 0 &&
      cards.every((card) => card.matched)
    ) {
      setWon(true);
    }

  }, [cards]);

  const flipCard = (index) => {

    if (
      first !== null &&
      second !== null
    ) return;

    if (
      cards[index].flipped ||
      cards[index].matched
    ) return;

    const newCards = [...cards];

    newCards[index].flipped = true;

    setCards(newCards);

    if (first === null) {
      setFirst(index);
    } else {
      setSecond(index);
    }
  };

  const resetGame = () => {
    setCards(createCards());
    setFirst(null);
    setSecond(null);
    setMoves(0);
    setWon(false);
  };

  return (
    <div className="text-center">

      <h2 className="text-3xl font-bold mb-2">
        🧠 Memory Match
      </h2>

      <p className="text-slate-400 mb-6">
        Difficulty: {difficulty}
      </p>

      <div className="grid grid-cols-4 md:grid-cols-5 gap-3 max-w-2xl mx-auto">

        {cards.map((card, index) => (

          <button
            key={card.id}
            onClick={() => flipCard(index)}
            className="aspect-square rounded-xl bg-blue-600 hover:bg-blue-500 text-3xl flex items-center justify-center"
          >
            {card.flipped || card.matched
              ? card.symbol
              : "?"}
          </button>

        ))}

      </div>

      <p className="mt-5 text-slate-300">
        Moves: {moves}
      </p>

      {won && (
        <p className="text-green-400 font-bold text-xl mt-4">
          🎉 All pairs matched!
        </p>
      )}

      <button
        onClick={resetGame}
        className="mt-5 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl"
      >
        New Game
      </button>

    </div>
  );
}

/* =========================================================
   3. WORD SCRAMBLE
========================================================= */

function WordScramble({ difficulty }) {

  const words = {

    Beginner: [
      "CAT",
      "DOG",
      "SUN",
      "BOOK",
      "TREE",
    ],

    Easy: [
      "APPLE",
      "HOUSE",
      "WATER",
      "MOUSE",
      "PHONE",
    ],

    Medium: [
      "COMPUTER",
      "PYTHON",
      "JAVASCRIPT",
      "DATABASE",
      "KEYBOARD",
    ],

    Hard: [
      "ALGORITHM",
      "ARTIFICIAL",
      "INTELLIGENCE",
      "PROGRAMMING",
      "DEVELOPER",
    ],

    Expert: [
      "CYBERSECURITY",
      "NEUROSCIENCE",
      "IMPLEMENTATION",
      "CRYPTOGRAPHY",
      "OPTIMIZATION",
    ],
  };

  const getNewWord = () => {

    const list = words[difficulty];

    const word =
      list[Math.floor(Math.random() * list.length)];

    return {
      word,
      scrambled: shuffleArray(
        word.split("")
      ).join(""),
    };
  };

  const [game, setGame] = useState(
    getNewWord
  );

  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setGame(getNewWord());
    setAnswer("");
    setScore(0);
    setMessage("");
  }, [difficulty]);

  const checkAnswer = () => {

    if (
      answer.trim().toUpperCase() ===
      game.word
    ) {

      setScore((s) => s + 1);
      setMessage("Correct! 🎉");

    } else {

      setMessage(
        `Wrong! Correct answer: ${game.word}`
      );
    }
  };

  const newWord = () => {
    setGame(getNewWord());
    setAnswer("");
    setMessage("");
  };

  return (
    <div className="max-w-xl mx-auto text-center">

      <h2 className="text-3xl font-bold mb-2">
        🔤 Word Scramble
      </h2>

      <p className="text-slate-400 mb-8">
        Difficulty: {difficulty}
      </p>

      <div className="bg-slate-800 rounded-2xl p-8">

        <p className="text-slate-400 mb-3">
          Unscramble this word:
        </p>

        <div className="text-4xl font-bold tracking-widest mb-8">
          {game.scrambled}
        </div>

        <input
          value={answer}
          onChange={(e) =>
            setAnswer(e.target.value)
          }
          placeholder="Enter your answer"
          className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-center uppercase"
        />

        <button
          onClick={checkAnswer}
          className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold"
        >
          Check Answer
        </button>

        {message && (
          <p className="mt-5 font-semibold">
            {message}
          </p>
        )}

        <p className="mt-4 text-slate-400">
          Score: {score}
        </p>

        <button
          onClick={newWord}
          className="mt-5 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl"
        >
          New Word
        </button>

      </div>

    </div>
  );
}

/* =========================================================
   4. PATTERN GAME
========================================================= */

function PatternGame({ difficulty }) {

  const patterns = {

    Beginner: [
      {
        sequence: ["🔴", "🔵", "🔴", "🔵", "?"],
        options: ["🔴", "🟢", "🟡"],
        answer: "🔴",
      },
      {
        sequence: ["⭐", "🌙", "⭐", "🌙", "?"],
        options: ["⭐", "☀️", "🌙"],
        answer: "⭐",
      },
    ],

    Easy: [
      {
        sequence: ["1", "2", "1", "2", "1", "?"],
        options: ["1", "2", "3"],
        answer: "2",
      },
      {
        sequence: ["A", "B", "C", "A", "B", "?"],
        options: ["A", "B", "C"],
        answer: "C",
      },
    ],

    Medium: [
      {
        sequence: ["2", "4", "6", "8", "?"],
        options: ["9", "10", "12"],
        answer: "10",
      },
      {
        sequence: ["3", "6", "9", "12", "?"],
        options: ["14", "15", "16"],
        answer: "15",
      },
    ],

    Hard: [
      {
        sequence: ["1", "4", "9", "16", "?"],
        options: ["20", "25", "30"],
        answer: "25",
      },
      {
        sequence: ["2", "6", "12", "20", "?"],
        options: ["24", "30", "32"],
        answer: "30",
      },
    ],

    Expert: [
      {
        sequence: ["2", "5", "10", "17", "26", "?"],
        options: ["35", "37", "40"],
        answer: "37",
      },
      {
        sequence: ["1", "2", "6", "24", "120", "?"],
        options: ["240", "720", "600"],
        answer: "720",
      },
    ],
  };

  const getPattern = () => {

    const list = patterns[difficulty];

    return list[
      Math.floor(Math.random() * list.length)
    ];
  };

  const [currentPattern, setCurrentPattern] =
    useState(getPattern);

  const [result, setResult] = useState("");

  useEffect(() => {
    setCurrentPattern(getPattern());
    setResult("");
  }, [difficulty]);

  const checkAnswer = (answer) => {

    if (answer === currentPattern.answer) {
      setResult("Correct! 🎉");
    } else {
      setResult("Wrong! Try another pattern.");
    }
  };

  const newPattern = () => {
    setCurrentPattern(getPattern());
    setResult("");
  };

  return (
    <div className="text-center max-w-2xl mx-auto">

      <h2 className="text-3xl font-bold mb-2">
        🔷 Pattern Recognition
      </h2>

      <p className="text-slate-400 mb-8">
        Difficulty: {difficulty}
      </p>

      <div className="flex justify-center flex-wrap gap-3 mb-8">

        {currentPattern.sequence.map(
          (item, index) => (

            <div
              key={index}
              className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-2xl font-bold"
            >
              {item}
            </div>

          )
        )}

      </div>

      <p className="text-slate-300 mb-4">
        What comes next?
      </p>

      <div className="flex justify-center gap-4">

        {currentPattern.options.map(
          (option) => (

            <button
              key={option}
              onClick={() =>
                checkAnswer(option)
              }
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold"
            >
              {option}
            </button>

          )
        )}

      </div>

      {result && (
        <p className="mt-6 text-xl font-bold">
          {result}
        </p>
      )}

      <button
        onClick={newPattern}
        className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl"
      >
        New Pattern
      </button>

    </div>
  );
}

/* =========================================================
   5. MATH GAME
========================================================= */

function MathGame({ difficulty }) {

  const generateQuestion = () => {

    let a;
    let b;
    let c;
    let question;
    let answer;

    if (difficulty === "Beginner") {

      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;

      question = `${a} + ${b}`;
      answer = a + b;

    } else if (difficulty === "Easy") {

      a = Math.floor(Math.random() * 30) + 1;
      b = Math.floor(Math.random() * 20) + 1;

      const operation =
        Math.floor(Math.random() * 4);

      if (operation === 0) {
        question = `${a} + ${b}`;
        answer = a + b;
      } else if (operation === 1) {
        question = `${a} - ${b}`;
        answer = a - b;
      } else if (operation === 2) {
        question = `${a} × ${b}`;
        answer = a * b;
      } else {
        a = Math.floor(Math.random() * 12) + 1;
        question = `${a}²`;
        answer = a * a;
      }

    } else if (difficulty === "Medium") {

      a = Math.floor(Math.random() * 20) + 2;
      b = Math.floor(Math.random() * 20) + 2;

      const operation =
        Math.floor(Math.random() * 4);

      if (operation === 0) {

        question = `${a} × ${b} + ${b}`;
        answer = a * b + b;

      } else if (operation === 1) {

        const root =
          Math.floor(Math.random() * 12) + 2;

        question = `√${root * root}`;
        answer = root;

      } else if (operation === 2) {

        const number =
          Math.floor(Math.random() * 15) + 1;

        question = `${number}² + ${b}`;
        answer = number * number + b;

      } else {

        question = `(${a} + ${b}) × 2`;
        answer = (a + b) * 2;
      }

    } else if (difficulty === "Hard") {

      a = Math.floor(Math.random() * 20) + 2;
      b = Math.floor(Math.random() * 15) + 2;
      c = Math.floor(Math.random() * 10) + 1;

      const operation =
        Math.floor(Math.random() * 4);

      if (operation === 0) {

        question = `${a} × ${b} - ${c}`;
        answer = a * b - c;

      } else if (operation === 1) {

        question = `${a}² - ${b}`;
        answer = a * a - b;

      } else if (operation === 2) {

        question = `${a}³`;
        answer = a * a * a;

      } else {

        const root =
          Math.floor(Math.random() * 15) + 1;

        question = `√${root * root} + ${c}`;
        answer = root + c;
      }

    } else {

      a = Math.floor(Math.random() * 15) + 2;
      b = Math.floor(Math.random() * 15) + 2;
      c = Math.floor(Math.random() * 10) + 2;

      const operation =
        Math.floor(Math.random() * 5);

      if (operation === 0) {

        question =
          `(${a} + ${b}) × ${c}`;

        answer =
          (a + b) * c;

      } else if (operation === 1) {

        question =
          `${a}² + ${b}²`;

        answer =
          a * a + b * b;

      } else if (operation === 2) {

        question =
          `√${a * a} × ${b}`;

        answer =
          a * b;

      } else if (operation === 3) {

        question =
          `${a}³ - ${b}`;

        answer =
          a * a * a - b;

      } else {

        question =
          `(${a} + ${b})²`;

        answer =
          (a + b) * (a + b);
      }
    }

    return {
      question,
      answer,
    };
  };

  const [problem, setProblem] =
    useState(generateQuestion);

  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setProblem(generateQuestion());
    setAnswer("");
    setScore(0);
    setMessage("");
  }, [difficulty]);

  const checkAnswer = () => {

    // Prevent the same question from increasing the score more than once.
    if (message === "Correct! 🎉") {
      return;
    }

    if (
      Number(answer) === problem.answer
    ) {

      setScore((s) => s + 1);
      setMessage("Correct! 🎉");

    } else {

      setMessage(
        `Wrong! Correct answer is ${problem.answer}`
      );
    }
  };

  const newQuestion = () => {

    setProblem(generateQuestion());
    setAnswer("");
    setMessage("");
  };

  return (
    <div className="max-w-xl mx-auto text-center">

      <h2 className="text-3xl font-bold mb-2">
        ➗ Math Challenge
      </h2>

      <p className="text-slate-400 mb-8">
        Difficulty: {difficulty}
      </p>

      <div className="bg-slate-800 rounded-2xl p-8">

        <div className="text-4xl font-bold mb-8">
          {problem.question}
        </div>

        <input
          type="number"
          value={answer}
          onChange={(e) =>
            setAnswer(e.target.value)
          }
          placeholder="Your answer"
          className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-center"
        />

        <button
          onClick={checkAnswer}
          className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold"
        >
          Submit Answer
        </button>

        {message && (
          <p className="mt-5 font-semibold">
            {message}
          </p>
        )}

        <p className="mt-4 text-slate-400">
          Score: {score}
        </p>

        <button
          onClick={newQuestion}
          className="mt-5 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl"
        >
          New Question
        </button>

      </div>

    </div>
  );
}


/* =========================================================
   6. RIDDLE GAME
========================================================= */

function RiddleGame({ difficulty, appearance = "Dark" }) {
  const isLight = appearance === "Light";

  const riddles = {
    Beginner: [
      {
        question: "What has hands but cannot clap?",
        options: ["Clock", "Tree", "Book"],
        answer: "Clock",
      },
      {
        question: "What has a face and two hands but no arms or legs?",
        options: ["Clock", "Robot", "Chair"],
        answer: "Clock",
      },
      {
        question: "What has many keys but cannot open a door?",
        options: ["Piano", "House", "Car"],
        answer: "Piano",
      },
      {
        question: "What gets wetter as it dries?",
        options: ["Towel", "Paper", "Sponge"],
        answer: "Towel",
      },
      {
        question: "What has a neck but no head?",
        options: ["Bottle", "Person", "Shirt"],
        answer: "Bottle",
      },
    ],

    Easy: [
      {
        question:
          "What can travel around the world while staying in one corner?",
        options: ["Stamp", "Plane", "Map"],
        answer: "Stamp",
      },
      {
        question: "What has one eye but cannot see?",
        options: ["Needle", "Bird", "Camera"],
        answer: "Needle",
      },
      {
        question: "What has words but never speaks?",
        options: ["Book", "Phone", "Radio"],
        answer: "Book",
      },
      {
        question: "What has legs but does not walk?",
        options: ["Table", "Dog", "Person"],
        answer: "Table",
      },
      {
        question: "What can you catch but cannot throw?",
        options: ["Cold", "Ball", "Stone"],
        answer: "Cold",
      },
    ],

    Medium: [
      {
        question:
          "I am always in front of you but cannot be seen. What am I?",
        options: ["Future", "Shadow", "Air"],
        answer: "Future",
      },
      {
        question:
          "The more you take, the more you leave behind. What are they?",
        options: ["Footsteps", "Books", "Coins"],
        answer: "Footsteps",
      },
      {
        question:
          "What has cities but no houses, forests but no trees, and rivers but no water?",
        options: ["Map", "Book", "Globe"],
        answer: "Map",
      },
      {
        question: "What disappears the moment you say its name?",
        options: ["Silence", "Shadow", "Light"],
        answer: "Silence",
      },
      {
        question: "What is full of holes but can still hold water?",
        options: ["Sponge", "Bucket", "Glass"],
        answer: "Sponge",
      },
    ],

    Hard: [
      {
        question: "What has an endless supply of letters but starts empty?",
        options: ["Mailbox", "Keyboard", "Book"],
        answer: "Mailbox",
      },
      {
        question:
          "What belongs to you but other people use it more than you?",
        options: ["Your name", "Your phone", "Your shoes"],
        answer: "Your name",
      },
      {
        question: "What breaks but is never held?",
        options: ["Promise", "Glass", "Stick"],
        answer: "Promise",
      },
      {
        question: "What has a head, a tail, is brown, and has no legs?",
        options: ["Coin", "Snake", "Dog"],
        answer: "Coin",
      },
      {
        question: "What can fill a room but takes up no space?",
        options: ["Light", "Chair", "Table"],
        answer: "Light",
      },
    ],

    Expert: [
      {
        question: "I speak without a mouth and hear without ears. What am I?",
        options: ["Echo", "Wind", "Radio"],
        answer: "Echo",
      },
      {
        question: "The more there is, the less you see. What is it?",
        options: ["Darkness", "Light", "Water"],
        answer: "Darkness",
      },
      {
        question: "I have branches but no fruit, trunk or leaves. What am I?",
        options: ["Bank", "Tree", "River"],
        answer: "Bank",
      },
      {
        question: "What has an eye but cannot see and moves without legs?",
        options: ["Storm", "Needle", "Cloud"],
        answer: "Storm",
      },
      {
        question: "What is something that nobody wants, but nobody wants to lose?",
        options: ["Time", "Money", "Sleep"],
        answer: "Time",
      },
    ],
  };

  const [questionOrder, setQuestionOrder] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState("");
  const [finished, setFinished] = useState(false);
  const [answered, setAnswered] = useState(false);

  const startGame = () => {
    const selectedRiddles = riddles[difficulty] || riddles.Beginner;

    const indexes = Array.from(
      { length: selectedRiddles.length },
      (_, i) => i
    );

    setQuestionOrder(shuffleArray(indexes));
    setCurrentRound(0);
    setScore(0);
    setResult("");
    setFinished(false);
    setAnswered(false);
  };

  useEffect(() => {
    startGame();
  }, [difficulty]);

  if (questionOrder.length === 0) {
    return null;
  }

  const selectedRiddles = riddles[difficulty] || riddles.Beginner;
  const currentQuestion = selectedRiddles[questionOrder[currentRound]];

  const chooseAnswer = (option) => {
    if (answered) return;

    setAnswered(true);

    if (option === currentQuestion.answer) {
      setScore((previousScore) => previousScore + 1);
      setResult("Correct! 🎉");
    } else {
      setResult(`Wrong! Correct answer: ${currentQuestion.answer}`);
    }

    setTimeout(() => {
      if (currentRound + 1 < questionOrder.length) {
        setCurrentRound((round) => round + 1);
        setResult("");
        setAnswered(false);
      } else {
        setFinished(true);
      }
    }, 1000);
  };

  const cardClass = isLight
    ? "bg-white border border-gray-200 text-gray-900 shadow-sm"
    : "bg-slate-800 border border-slate-700 text-white";

  const mutedText = isLight ? "text-gray-600" : "text-slate-400";

  if (finished) {
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <div className={`rounded-3xl p-8 ${cardClass}`}>
          <h2 className="text-3xl font-bold mb-4">
            ❓ Riddle Challenge Complete!
          </h2>

          <p className={mutedText}>Your score</p>

          <p className="text-4xl text-green-500 font-bold mt-3">
            {score} / {questionOrder.length}
          </p>

          <p className={`mt-3 ${mutedText}`}>
            {score === questionOrder.length
              ? "Amazing! You solved every riddle!"
              : score >= 3
              ? "Great job! Keep challenging your mind."
              : "Keep practising. You will improve!"}
          </p>

          <button
            onClick={startGame}
            className="mt-8 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="text-3xl font-bold mb-2">
        ❓ Riddle Challenge
      </h2>

      <p className={`${mutedText} mb-6`}>
        Difficulty: {difficulty}
      </p>

      <p className={`${mutedText} mb-5`}>
        Round {currentRound + 1} / {questionOrder.length}
      </p>

      <div className={`rounded-2xl p-6 sm:p-8 ${cardClass}`}>
        <h3 className="text-xl sm:text-2xl font-semibold mb-8">
          {currentQuestion.question}
        </h3>

        <div className="grid gap-3">
          {currentQuestion.options.map((option) => {
            const isCorrectOption = option === currentQuestion.answer;

            let optionClass = isLight
              ? "bg-gray-100 hover:bg-blue-100 text-gray-900 border border-gray-200"
              : "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600";

            if (answered && isCorrectOption) {
              optionClass = "bg-green-600 text-white border border-green-500";
            } else if (answered) {
              optionClass = isLight
                ? "bg-gray-100 text-gray-400 border border-gray-200"
                : "bg-slate-700 text-slate-400 border border-slate-600";
            }

            return (
              <button
                key={option}
                onClick={() => chooseAnswer(option)}
                disabled={answered}
                className={`w-full py-4 px-4 rounded-xl font-semibold transition ${optionClass} ${
                  answered ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {result && (
          <p
            className={`mt-6 font-bold ${
              result.startsWith("Correct")
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {result}
          </p>
        )}

        <p className={`mt-5 ${mutedText}`}>
          Score: {score}
        </p>
      </div>
    </div>
  );
}


/* =========================================================
   7. QUICK QUIZ GAME
========================================================= */

function QuizGame({ difficulty, appearance = "Dark" }) {
  const isLight = appearance === "Light";

  const questions = {
    Beginner: [
      {
        question: "What is 5 + 7?",
        options: ["10", "11", "12", "13"],
        answer: "12",
      },
      {
        question: "How many days are in a week?",
        options: ["5", "6", "7", "8"],
        answer: "7",
      },
      {
        question: "Which planet do we live on?",
        options: ["Mars", "Earth", "Venus", "Jupiter"],
        answer: "Earth",
      },
    ],
    Easy: [
      {
        question: "Which language is used to style web pages?",
        options: ["Python", "CSS", "SQL", "C"],
        answer: "CSS",
      },
      {
        question: "What is 9 × 6?",
        options: ["45", "54", "56", "64"],
        answer: "54",
      },
      {
        question: "Which is a JavaScript data type?",
        options: ["Boolean", "Website", "Keyboard", "Browser"],
        answer: "Boolean",
      },
      {
        question: "Which device is used to type text?",
        options: ["Monitor", "Keyboard", "Speaker", "Printer"],
        answer: "Keyboard",
      },
      {
        question: "How many sides does a triangle have?",
        options: ["2", "3", "4", "5"],
        answer: "3",
      },
    ],
    Medium: [
      {
        question: "Which data structure follows FIFO?",
        options: ["Stack", "Queue", "Tree", "Graph"],
        answer: "Queue",
      },
      {
        question: "Which SQL command retrieves data?",
        options: ["SELECT", "UPDATE", "DELETE", "INSERT"],
        answer: "SELECT",
      },
      {
        question: "What does HTML stand for?",
        options: [
          "HyperText Markup Language",
          "HighText Machine Language",
          "Hyper Transfer Main Link",
          "Home Tool Markup Language",
        ],
        answer: "HyperText Markup Language",
      },
      {
        question: "Which operator checks strict equality in JavaScript?",
        options: ["=", "==", "===", "!="],
        answer: "===",
      },
      {
        question: "Which keyword declares a constant in JavaScript?",
        options: ["let", "var", "const", "static"],
        answer: "const",
      },
    ],
    Hard: [
      {
        question: "Which algorithmic complexity is typical for binary search?",
        options: ["O(n)", "O(log n)", "O(n²)", "O(2ⁿ)"],
        answer: "O(log n)",
      },
      {
        question: "Which HTTP method is commonly used to retrieve data?",
        options: ["GET", "POST", "PATCH", "DELETE"],
        answer: "GET",
      },
      {
        question: "Which SQL clause filters grouped results?",
        options: ["WHERE", "ORDER BY", "HAVING", "LIMIT"],
        answer: "HAVING",
      },
      {
        question: "Which React hook stores component state?",
        options: ["useEffect", "useState", "useRef", "useMemo"],
        answer: "useState",
      },
      {
        question: "Which data structure is commonly used for BFS?",
        options: ["Stack", "Queue", "Heap", "Hash table"],
        answer: "Queue",
      },
    ],
    Expert: [
      {
        question: "Which data structure supports average O(1) key lookup?",
        options: ["Hash table", "Linked list", "Binary search tree in all cases", "Unsorted array"],
        answer: "Hash table",
      },
      {
        question: "What does ACID stand for in database transactions?",
        options: [
          "Atomicity, Consistency, Isolation, Durability",
          "Access, Control, Index, Data",
          "Atomicity, Control, Integrity, Distribution",
          "Availability, Consistency, Indexing, Durability",
        ],
        answer: "Atomicity, Consistency, Isolation, Durability",
      },
      {
        question: "Which technique helps prevent SQL injection?",
        options: [
          "String concatenation",
          "Parameterized queries",
          "Disabling indexes",
          "Using longer table names",
        ],
        answer: "Parameterized queries",
      },
      {
        question: "What does a React key help identify?",
        options: [
          "Items in a rendered list",
          "The user's password",
          "The API server address",
          "The CSS theme",
        ],
        answer: "Items in a rendered list",
      },
      {
        question: "Which protocol secures HTTP communication?",
        options: ["FTP", "SMTP", "TLS", "Telnet"],
        answer: "TLS",
      },
    ],
  };

  const quiz = questions[difficulty] || questions.Beginner;

  const [questionOrder, setQuestionOrder] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState("");
  const [finished, setFinished] = useState(false);
  const [answered, setAnswered] = useState(false);

  const startGame = () => {
    setQuestionOrder(
      shuffleArray(Array.from({ length: quiz.length }, (_, i) => i))
    );
    setCurrentRound(0);
    setScore(0);
    setResult("");
    setFinished(false);
    setAnswered(false);
  };

  useEffect(() => {
    startGame();
  }, [difficulty]);

  if (questionOrder.length === 0) return null;

  const currentQuestion = quiz[questionOrder[currentRound]];

  const chooseAnswer = (option) => {
    if (answered) return;

    setAnswered(true);

    if (option === currentQuestion.answer) {
      setScore((previous) => previous + 1);
      setResult("Correct! 🎉");
    } else {
      setResult(`Wrong! Correct answer: ${currentQuestion.answer}`);
    }

    setTimeout(() => {
      if (currentRound + 1 < questionOrder.length) {
        setCurrentRound((round) => round + 1);
        setResult("");
        setAnswered(false);
      } else {
        setFinished(true);
      }
    }, 1000);
  };

  const cardClass = isLight
    ? "bg-white border border-gray-200 text-gray-900 shadow-sm"
    : "bg-slate-800 border border-slate-700 text-white";

  const mutedText = isLight ? "text-gray-600" : "text-slate-400";

  if (finished) {
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <div className={`rounded-3xl p-8 ${cardClass}`}>
          <h2 className="text-3xl font-bold mb-4">
            🧠 Quick Quiz Complete!
          </h2>

          <p className={mutedText}>Your score</p>

          <p className="text-4xl text-green-500 font-bold mt-3">
            {score} / {questionOrder.length}
          </p>

          <button
            onClick={startGame}
            className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="text-3xl font-bold mb-2">
        🧠 Quick Quiz
      </h2>

      <p className={`${mutedText} mb-6`}>
        Difficulty: {difficulty}
      </p>

      <p className={`${mutedText} mb-5`}>
        Question {currentRound + 1} / {questionOrder.length}
      </p>

      <div className={`rounded-2xl p-6 sm:p-8 ${cardClass}`}>
        <h3 className="text-xl sm:text-2xl font-semibold mb-8">
          {currentQuestion.question}
        </h3>

        <div className="grid gap-3">
          {currentQuestion.options.map((option) => {
            const isCorrectOption = option === currentQuestion.answer;

            let optionClass = isLight
              ? "bg-gray-100 hover:bg-blue-100 text-gray-900 border border-gray-200"
              : "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600";

            if (answered && isCorrectOption) {
              optionClass = "bg-green-600 text-white border border-green-500";
            } else if (answered) {
              optionClass = isLight
                ? "bg-gray-100 text-gray-400 border border-gray-200"
                : "bg-slate-700 text-slate-400 border border-slate-600";
            }

            return (
              <button
                key={option}
                onClick={() => chooseAnswer(option)}
                disabled={answered}
                className={`w-full py-4 px-4 rounded-xl font-semibold transition ${optionClass}`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {result && (
          <p
            className={`mt-6 font-bold ${
              result.startsWith("Correct")
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {result}
          </p>
        )}

        <p className={`mt-5 ${mutedText}`}>
          Score: {score}
        </p>
      </div>
    </div>
  );
}





export default App;


function SettingsForm({ appearance, setAppearance }) {
  const [alarmTime, setAlarmTime] = useState(
    localStorage.getItem("settings_alarmTime") || "07:00"
  );

  const [difficulty, setDifficulty] = useState(
    localStorage.getItem("settings_difficulty") || "Easy"
  );

  const [notifications, setNotifications] = useState(
    localStorage.getItem("settings_notifications") !== "false"
  );




const [message, setMessage] = useState("");

function saveSettings(e) {
  e.preventDefault();

  localStorage.setItem("settings_alarmTime", alarmTime);
  localStorage.setItem("settings_difficulty", difficulty);
  localStorage.setItem("settings_notifications", String(notifications));
  localStorage.setItem("settings_appearance", appearance);

  setMessage("Settings saved successfully!");
}

return (
  <form onSubmit={saveSettings} className="space-y-6">

    {/* Default Alarm Time */}
    <div>
      <label
        className={`block mb-2 ${
          appearance === "Light" ? "text-gray-700" : "text-slate-300"
        }`}
      >
        ⏰ Default Alarm Time
      </label>

      <input
        type="time"
        value={alarmTime}
        onChange={(e) => setAlarmTime(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl border outline-none ${
          appearance === "Light"
            ? "bg-white border-gray-300 text-gray-900"
            : "bg-slate-800 border-slate-700 text-white"
        }`}
      />
    </div>

    {/* Challenge Difficulty */}
    <div>
      <label
        className={`block mb-2 ${
          appearance === "Light" ? "text-gray-700" : "text-slate-300"
        }`}
      >
        🧠 Challenge Difficulty
      </label>

      <select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl border outline-none ${
          appearance === "Light"
            ? "bg-white border-gray-300 text-gray-900"
            : "bg-slate-800 border-slate-700 text-white"
        }`}
      >
        <option>Beginner</option>
        <option>Easy</option>
        <option>Medium</option>
        <option>Hard</option>
        <option>Expert</option>
      </select>
    </div>

    {/* Notifications */}
    <div>
      <label
        className={`block mb-3 ${
          appearance === "Light" ? "text-gray-700" : "text-slate-300"
        }`}
      >
        🔔 Notifications
      </label>

      <label
        className={`flex items-center gap-3 ${
          appearance === "Light" ? "text-gray-700" : "text-slate-300"
        }`}
      >
        <input
          type="checkbox"
          checked={notifications}
          onChange={(e) => setNotifications(e.target.checked)}
          className="w-5 h-5 accent-blue-600"
        />
        Enable notifications
      </label>
    </div>

    {/* Appearance */}
    <div>
      <label
        className={`block mb-2 ${
          appearance === "Light" ? "text-gray-700" : "text-slate-300"
        }`}
      >
        🎨 Appearance
      </label>

      <select
        value={appearance}
        onChange={(e) => setAppearance(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl border outline-none ${
          appearance === "Light"
            ? "bg-white border-gray-300 text-gray-900"
            : "bg-slate-800 border-slate-700 text-white"
        }`}
      >
        <option>Dark</option>
        <option>Light</option>
      </select>
    </div>

    {/* Save Settings */}
    <button
      type="submit"
      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
    >
      💾 Save Settings
    </button>

    {message && (
      <p className="text-center text-green-500">
        {message}
      </p>
    )}

  </form>
);
}
