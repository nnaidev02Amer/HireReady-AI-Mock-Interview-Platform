"""Demo Mode content: works with no Gemini API key and no network.

Questions come from a built-in bank chosen by keywords in the job description.
The "analysis" is SAMPLE data generated from the questions only. It does not look at
the recording, and it is labelled as a demo result so it is never mistaken for real feedback.
"""
import hashlib
import random

DEMO_NOTE = (
    "Demo analysis: this is sample feedback, not based on your actual recording. "
    "Add a Gemini API key to get a real analysis."
)

# Technical questions are ordered easy -> hard within each role.
TECHNICAL = {
    "python": [
        "What is the difference between a list and a tuple in Python?",
        "How do you handle exceptions in Python, and when would you create a custom exception?",
        "Explain how decorators work and give an example of when you would use one.",
        "What are generators, and how do they differ from regular functions that return lists?",
        "How would you profile and speed up a slow Python function?",
        "Explain the Global Interpreter Lock and how it affects concurrency.",
        "How would you design a REST API in FastAPI or Flask that handles authentication and validation?",
        "How do you structure and test a large Python codebase so it stays maintainable?",
    ],
    "frontend": [
        "What is the difference between let, const and var in JavaScript?",
        "How does the virtual DOM work in React?",
        "Explain how useEffect works and how you avoid common pitfalls with it.",
        "How would you manage state in a growing React application?",
        "How do you improve the performance of a slow React page?",
        "Explain the browser rendering pipeline and what causes layout thrashing.",
        "How would you make a web application accessible and responsive?",
        "How do you design the front-end architecture for a large application with many teams?",
    ],
    "backend": [
        "What is the difference between SQL and NoSQL databases?",
        "How does token-based authentication work?",
        "Explain REST and how it differs from GraphQL.",
        "How would you design a database schema for a booking application?",
        "How do you make an API fast and reliable under heavy load?",
        "How would you handle database migrations without downtime?",
        "Describe how you would design a rate limiter.",
        "How do you approach scaling a service from one server to many?",
    ],
    "data": [
        "What is the difference between supervised and unsupervised learning?",
        "How do you handle missing values in a dataset?",
        "Explain overfitting and how to prevent it.",
        "How do you choose evaluation metrics for an imbalanced classification problem?",
        "How would you design an A/B test and decide whether the result is significant?",
        "Explain the bias-variance trade-off with a practical example.",
        "How would you put a machine learning model into production and monitor it?",
        "How do you explain a complex model's predictions to non-technical stakeholders?",
    ],
    "devops": [
        "What is the difference between a container and a virtual machine?",
        "What does a CI/CD pipeline do?",
        "How do you manage secrets in deployments?",
        "Explain how you would monitor a production service and what you would alert on.",
        "How do you perform a zero-downtime deployment?",
        "How would you debug a service that is intermittently failing in Kubernetes?",
        "How do you design infrastructure as code so it is reviewable and safe?",
        "Describe how you would plan disaster recovery for a critical system.",
    ],
    "general": [
        "Which skills from the job description are your strongest, and why?",
        "Describe a technical or professional problem you solved recently.",
        "How do you keep your skills up to date in your field?",
        "How do you prioritise when you have several urgent tasks?",
        "Describe how you would approach learning a tool you have never used.",
        "How do you make sure your work is correct before you hand it over?",
        "Describe a time you improved a process or a product. What was the impact?",
        "How would you handle a disagreement with a colleague about the right approach?",
    ],
}

BEHAVIORAL = [
    "Tell me about yourself and why you are interested in this role.",
    "Describe a time you had to learn something new quickly. How did you approach it?",
    "Tell me about a time you worked in a team and faced a conflict. How did you resolve it?",
    "Describe a mistake you made at work or in a project. What did you learn?",
    "Tell me about a time you had to meet a tight deadline.",
    "What is your greatest strength, and how does it help you at work?",
    "Describe a situation where you received critical feedback. How did you respond?",
    "Where do you see yourself in the next three years?",
    "Tell me about a project you are proud of and your contribution to it.",
    "Why should we hire you for this position?",
]

ROLE_KEYWORDS = [
    ("data", ("data scien", "machine learning", "ml ", "analyst", "analytics", "ai engineer", "deep learning")),
    ("devops", ("devops", "sre", "site reliab", "kubernetes", "docker", "cloud engineer", "infrastructure")),
    ("frontend", ("react", "frontend", "front-end", "front end", "javascript", "typescript", "angular", "vue", "web developer", "ui ")),
    ("python", ("python", "django", "flask", "fastapi")),
    ("backend", ("backend", "back-end", "back end", "java", "node", "api", "database", "sql", "golang", ".net", "software engineer", "developer")),
]


def _role_pool(job_description: str) -> str:
    text = f" {job_description.lower()} "
    for role, words in ROLE_KEYWORDS:
        if any(w in text for w in words):
            return role
    return "general"


def _seed(*parts) -> int:
    digest = hashlib.sha256("|".join(str(p) for p in parts).encode("utf-8")).hexdigest()
    return int(digest[:12], 16)


def generate_demo_questions(job_description: str, difficulty: str, num_questions: int) -> list:
    """Return exactly num_questions distinct questions, alternating technical / behavioral."""
    rng = random.Random(_seed(job_description.strip().lower(), difficulty))
    tech_pool = TECHNICAL[_role_pool(job_description)]

    n_tech = (num_questions + 1) // 2
    n_beh = num_questions - n_tech
    # The pool is ordered easy -> hard: pick the slice that matches the difficulty.
    if difficulty == "easy":
        tech = tech_pool[:n_tech]
    elif difficulty == "hard":
        tech = tech_pool[-n_tech:]
    else:
        start = max(0, (len(tech_pool) - n_tech) // 2)
        tech = tech_pool[start:start + n_tech]
    # Always open with "Tell me about yourself", then a seeded selection of the others.
    behavioral = ([BEHAVIORAL[0]] + rng.sample(BEHAVIORAL[1:], n_beh - 1)) if n_beh else []

    questions = []
    for i in range(num_questions):
        # Start with a behavioural opener ("Tell me about yourself") when we have one.
        source, idx = (behavioral, i // 2) if i % 2 == 0 and behavioral else (tech, i // 2)
        if idx >= len(source):
            source = tech if source is behavioral else behavioral
            idx = min(idx, len(source) - 1)
        questions.append(source[idx])
    # De-duplicate defensively (cannot happen with the current pools) and top up if needed.
    seen, unique = set(), []
    for q in questions:
        if q not in seen:
            seen.add(q)
            unique.append(q)
    for q in tech_pool + BEHAVIORAL:
        if len(unique) >= num_questions:
            break
        if q not in seen:
            seen.add(q)
            unique.append(q)
    return unique[:num_questions]


_ANSWERS = [
    "[Sample transcript] I started by clarifying the requirements, then explained my approach step by step and gave a concrete example from a recent project.",
    "[Sample transcript] In my experience the key is to keep things simple first, measure the result, and then improve the parts that matter most.",
    "[Sample transcript] I would break the problem into smaller pieces, discuss the trade-offs with the team, and validate the solution with tests.",
    "[Sample transcript] A good example was a project where I had to learn quickly, ask for feedback early and adjust my plan based on it.",
]
_BODY = [
    "Sample note: steady posture and mostly good eye contact with the camera.",
    "Sample note: relaxed posture, occasional looking away while thinking.",
    "Sample note: natural hand gestures and an engaged, upright posture.",
]
_COMM = [
    "Sample note: clear and confident tone with a steady pace.",
    "Sample note: generally fluent, with a few filler words and short pauses.",
    "Sample note: well structured answer, could be slightly more concise.",
]
_STRENGTHS = [
    "Clear structure",
    "Confident delivery",
    "Relevant examples",
    "Steady pace",
    "Positive attitude",
]
_IMPROVE = [
    "Reduce filler words",
    "Give more measurable results",
    "Keep answers more concise",
    "Maintain eye contact with the camera",
    "Pause briefly before answering",
]


def generate_demo_analysis(questions: list) -> dict:
    """Deterministic sample analysis in the same shape the real Gemini analysis returns."""
    rng = random.Random(_seed(*questions))
    items = []
    for q in questions:
        items.append(
            {
                "question": q,
                "answer": rng.choice(_ANSWERS),
                "score": rng.randint(62, 92),
                "body_language": rng.choice(_BODY),
                "communication": rng.choice(_COMM),
                "time_consumed_seconds": round(rng.uniform(35, 95), 1),
            }
        )
    overall = round(sum(i["score"] for i in items) / len(items))
    strengths = rng.sample(_STRENGTHS, 3)
    improvements = rng.sample(_IMPROVE, 2)
    return {
        "demo": True,
        "demo_note": DEMO_NOTE,
        "questions": items,
        "overall_score": overall,
        "insights": [
            "Sample insight: your answers show a clear structure and relevant examples.",
            "Sample insight: adding measurable results would make answers more convincing.",
            "Sample insight: keep a steady pace and pause briefly before answering.",
        ],
        "communication": {
            "score": round(min(10, max(1, overall / 10)), 1),
            "overallFeedback": "Sample feedback: you communicate clearly and with confidence. "
            "Work on conciseness and on backing claims with concrete results.",
            "supportingQuotes": [
                {
                    "quote": "I started by clarifying the requirements...",
                    "analysis": "Sample analysis: shows a structured approach.",
                    "type": "strength",
                },
                {
                    "quote": "Um, I think... maybe...",
                    "analysis": "Sample analysis: filler words reduce fluency.",
                    "type": "improvement_area",
                },
            ],
            "strengths": strengths,
            "improvementAreas": improvements,
        },
    }
