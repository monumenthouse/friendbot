var slack = new Slack(
  Meteor.settings.slackApiToken,
  true, /* autoReconnect */
  true /* autoMark */
);

deslackifyEmail = function (e) {
  if (m = e.match(/<mailto:.+\|(.+)>$/)) {
    e = m[1];
  }
  return e;
};

slack.on('open', Meteor.bindEnvironment(function () {
  console.log("opened slack connection");
}));

slack.on('message', Meteor.bindEnvironment(function (message) {
  var channel = slack.getChannelGroupOrDMByID(message.channel);
  var user = slack.getUserByID(message.user);
  if (! channel || ! user || message.type !== "message")
    return;

  var m = message.text.match(/^\s*friend(\s+.*|)$/i);
  if (m) {
    channel.send(
      "We don't use that list anymore!\n" +
        "- Use *subscribe [email address]* to put them on the public info@ " +
        "list.\n" +
        "- Or if they want to volunteer/collaborate, and should be on the " +
        "do@ list, tell them to go to the website and click the 'volunteer' " +
        "tab. Be selective: we actively prune obnoxious people from " +
        "this list.");
    return;
  }

  /*
  var m = message.text.match(/^\s*friend(\s+.*|)$/i);
  if (m) {
    var parts = m[1].split(/\s+/);
    parts = _.filter(parts, function (part) {
      return part.length > 0;
    });
    if (parts.length < 3 || ! parts[0].match(/^.+@.+$/)) {
      channel.send("To add a friend: \"friend [email address] [full name]\"\n" +
                   "Please use their first and last name so that curious " +
                   "members can Google them or find them on Facebook to " +
                   "figure out who they are.");
      return;
    }
    var email = deslackifyEmail(parts[0]);
    var fullName = parts.slice(1).join(' ');

    var record = Friends.findOne({ email: email });
    if (record) {
      if (message.user === record.addedById) {
        channel.send("@" + user.name + ", you already signed up " +
                     email + " as a friend.");
      } else {
        var otherUser = slack.getUserByID(record.addedById);
        channel.send("@" + user.name + ", as it turns out, " +
                     email + " was already signed up as a friend by " +
                     "@" + otherUser.name + ".");
      }
      return;
    }

    Friends.insert({
      name: fullName,
      email: email,
      addedBy: user.name,
      addedById: message.user,
      addedAt: new Date
    });

    addToList("friends@monument.house", email, function (outcome) {
      if (outcome === "added" || outcome === "already") {
        channel.send("Added " + fullName + " (" + email + "). " +
                     "Hooray, a new friend!");
        channel.send("We're now up to " + Friends.find().count() + " friends.");
      } else if (outcome === "error") {
        Friends.remove({ email: email});
        channel.send("Something went wrong while befriending " + email + ".\n" +
                     "Details are in the server logs.");
      }
    });

    return;
  }
  */

  m = message.text.match(/^\s*googleauth(\s+.*|)$/i);
  if (m) {
    channel.send("Please visit " + getAuthUrl());
    channel.send("Upon completing authentication you will be given a code. " +
                 "Tell it to me like this: \"googlecode [code here]\"");
    return;
  }

  m = message.text.match(/^\s*googlecode\s+([^\s]+)\s*$/i);
  if (m) {
    completeAuth(m[1], function (success) {
      channel.send(success ? "Got it!" : "Failed :(");
    });
  }

  m = message.text.match(/^\s*list(\s+.*|)$/i);
  if (m) {
    getListMembers("info@monument.house", function (members) {
      if (members) {
        channel.send(members.join(', '));
        channel.send("Note: this may not return all the members (limit 200?)");
      }
    });
  }

  m = message.text.match(/^\s*testemail(\s+.*|)$/i);
  if (m) {
    m = m[1].match(/^\s*([^\s@]+@[^\s]+)+\s*$/);
    if (! m) {
      channel.send("bahhhh");
      return;
    }
    var email = deslackifyEmail(m[1]);
    Email.send({
      to: email,
      from: "contact@monument.house",
      subject: "Your test email",
      text: "You're a cat! I mean it!",
      html: "You're a <b>cat</b>! Yes! A kitty cat."
    });
    channel.send("I sent you a test email, lovebug.");
  }

  m = message.text.match(/^\s*subscribe(\s+.*|)$/i);
  if (m) {
    m = m[1].match(/^\s*([^\s@]+@[^\s]+)+\s*$/);
    if (! m) {
      channel.send("Here's how to do it: \"subscribe [email address]\"\n" +
                   "Subscribes the person to the public Monument mailing " +
                   "than anyone can sign up for.");
      return;
    }
    var email = deslackifyEmail(m[1]);

    addToList("info@monument.house", email, function (outcome) {
      if (outcome === "added") {
        channel.send(email +
                     " is now on the public Monument announcement list.");
        Adds.insert({
          name: null,
          email: email,
          addedBy: user.name,
          addedById: message.user,
          addedAt: new Date,
          addedTo: "info"
        });
      }
      else if (outcome === "already")
        channel.send(email + " is already on the announcements list.");
      else if (outcome === "error")
        channel.send("Whups! I couldn't add " + email + ".\n" +
                     "Details are in the server logs.");
    });
  }

  /*
    NB: 'list' will only fetch the first 200 members. after that, you have
    to do the rest manually. but when I ran it there were only 206 so that
    was fine.
  m = message.text.match(/^\s*migrate-friends-to-info(\s+.*|)$/i);
  if (m) {
    getListMembers("friends@monument.house", function (members) {
      if (!members) {
        channel.send("couldn't get members");
        return;
      }

      channel.send("got " + members.length + " members");
      channel.send(members.join(', '));

      var addPeople = function (peopleToAdd) {
        if (peopleToAdd.length === 0) {
          channel.send("all done!");
          return;
        }

        var thisOne = peopleToAdd[0];
        addToList("info@monument.house", thisOne, function (outcome) {
          if (outcome === "added")
            channel.send("Added " + thisOne);
          else if (outcome === "already")
            channel.send("Already had " + thisOne);
          else
            channel.send("Failed to add " + thisOne + " (" + outcome + ")");
          addPeople(peopleToAdd.slice(1));
        });
      };

      addPeople(members);
    });
  }
  */
}));

slack.on('error', Meteor.bindEnvironment(function (error) {
  console.log('slack error: ', JSON.stringify(error));
}));

slack.login();
