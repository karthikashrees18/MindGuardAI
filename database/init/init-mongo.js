// Runs automatically the first time the mongo container starts with an
// empty data volume (Mongo's docker image executes anything in
// /docker-entrypoint-initdb.d/*.js against MONGO_DB on first boot).

db = db.getSiblingDB("mindguard");

db.createCollection("users");
db.users.createIndex({ email: 1 }, { unique: true });

db.createCollection("journals");
db.journals.createIndex({ user_id: 1, created_at: -1 });

db.createCollection("contacts");
db.contacts.createIndex({ user_id: 1 });

// --- Admin / Counselor analytics dashboard ---
db.createCollection("broadcasts");
db.broadcasts.createIndex({ created_at: -1 });

db.createCollection("audit_logs");
db.audit_logs.createIndex({ created_at: -1 });

db.createCollection("engagement_events");
db.engagement_events.createIndex({ created_at: -1 });
db.engagement_events.createIndex({ alert_type: 1 });

print("mindguard: collections + indexes ready");