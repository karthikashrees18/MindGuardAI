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

print("mindguard: collections + indexes ready");
