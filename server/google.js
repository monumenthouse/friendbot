var google = googleapis;
var googleAuth = new google.auth.OAuth2(
  Meteor.settings.googleClientId,
  Meteor.settings.googleClientSecret,
  "urn:ietf:wg:oauth:2.0:oob"
);
google.options({ auth: googleAuth });

// Load Google auth from database, if we have it.. otherwise someone
// will have to log us in by saying 'googleauth' to friendbot
var config = Config.findOne({key: "google-auth"});
if (config) {
  googleAuth.setCredentials(config.value);
}


getAuthUrl = function () {
  return googleAuth.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/admin.directory.group'
  });
};

completeAuth = function (token, callback) {
  googleAuth.getToken(token, Meteor.bindEnvironment(function (err, tokens) {
    if (err) {
      console.log("Couldn't complete google auth: " + JSON.stringify(err));
      callback(false);
    }

    // 'tokens' will contain access_token and refresh_token
    googleAuth.setCredentials(tokens);
    Config.update({ key: 'google-auth' },
                  { $set: { value: tokens } },
                  { upsert: true });
    callback(true);
  }));
};

getListMembers = function (listName, callback) {
  var service = google.admin('directory_v1');
    service.members.list({
      groupKey: listName
    }, Meteor.bindEnvironment(function (err, response) {
      if (err) {
        console.log('members.list returned an error: ' + JSON.stringify(err));
        callback(null);
      }
      callback(_.pluck(response.members, 'email'));
    }));
};

addToList = function (listName, email, callback) {
  var service = google.admin('directory_v1');
  service.members.insert({
    groupKey: listName,
    resource: {
      email: email,
      role: "MEMBER"
    }
  }, Meteor.bindEnvironment(function (err, response) {
    if (err) {
      var reasons = _.pluck(err.errors, 'reason');
      if (_.contains(reasons, 'duplicate')) {
        callback("already");
        return;
      }

      console.log("Failed to subscribe " + email + ": " +
                  JSON.stringify(err));
      callback("error");
      return;
    }

    callback("added");
  }));
};
