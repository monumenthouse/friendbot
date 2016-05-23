// Historical use only. (All these people were moved to info@)
// name: String
// email: String
// addedBy: String (Slack username, could get out of date)
// addedById: String (permanent Slack ID)
// addedAt: Date
Friends = new Mongo.Collection("friends");

// People added to lists through the script.
// name: String (may be null if not given)
// email: String
// addedBy: String (Slack username, could get out of date)
// addedById: String (permanent Slack ID)
// addedAt: Date
// addedTo: String (name of list added to, eg, "info")
Adds = new Mongo.Collection("adds");

// key: String (name of item)
// (rest of document): (whatever)
Config = new Mongo.Collection("config");
