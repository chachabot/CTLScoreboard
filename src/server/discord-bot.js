const Discord = require("discord.js");
const util = require("./util");
const logger = require("./logger");

class BotClient {
  constructor(token) {
    this.token = token;
    this.client = new Discord.Client();
    this.mainChannel = util.getDiscordMainChannel();
    this.testChannel = "the-lab";
    this.isReady = false;
    this.pendingMessages = [];
    this.previousVodUrl = "";
  }

  checkVodSameness(vodUrl, previousVodUrl) {
    if (vodUrl === previousVodUrl) {
      return "identical";
    } else if (vodUrl.split("?")[0] === previousVodUrl.split("?")[0]) {
      return "new timestamp";
    }
    return "different";
  }

  formatMatch(match) {
    const formattedDate = util.getMatchDateFormatted(match);
    const winnerHomeAwayLabel = match.winner_home ? "(H)" : "(A)";
    const loserHomeAwayLabel = match.winner_home ? "(A)" : "(H)";

    const vodSameness = this.checkVodSameness(
      match.vod_url,
      this.previousVodUrl
    );
    this.previousVodUrl = match.vod_url;
    const matchLine = `:fire: ${formattedDate} ${match.winner} ${winnerHomeAwayLabel} def. ${match.loser} ${loserHomeAwayLabel} ${match.winner_games}-${match.loser_games}`;

    if (vodSameness === "different") {
      // New post
      return [
        `--------------------------------\n${match.restreamer} restreamed:\n${match.vod_url}`,
        matchLine
      ];
    } else if (vodSameness === "new timestamp") {
      // Post the VOD with no preview and the match results
      const vodUrlNoPreview = "<" + match.vod_url + ">";
      return [`${vodUrlNoPreview}\n${matchLine}`];
    } else if (vodSameness === "identical") {
      // Post just the match results
      return [matchLine];
    }
  }

  sendMessageInChannel(messageText, channelName) {
    if (this.isReady) {
      const channel = this.client.channels.find(x => x.name === channelName);
      try {
        channel.send(messageText);
      } catch (err) {
        console.error(err);
      }
    } else {
      this.pendingMessages.push([messageText, channelName]);
    }
  }

  sendMessage(messageText) {
    this.sendMessageInChannel(messageText, this.mainChannel);
  }

  // Main entry point for using the bot from server-main.js
  reportMatch(match) {
    const messagesToSend = this.formatMatch(match);
    for (let i = 0; i < messagesToSend.length; i++) {
      this.sendMessage(messagesToSend[i]);
    }
  }

  start() {
    this.client.on("ready", () => {
      logger.log("CTL-Reporting-Bot is ready");
      this.isReady = true;

      while (this.pendingMessages.length > 0) {
        const pendingMessage = this.pendingMessages.shift();
        this.sendMessageInChannel(pendingMessage[0], pendingMessage[1]);
      }
    });

    this.client.on("message", msg => {
      // Main channel only listens for the bot check command
      if (msg.channel.name === this.mainChannel) {
        logger.log("got message in main channel aka", msg.channel.name);

        if (msg.content == "!bot") {
          this.sendMessage(
            "I'm online and ready to report matches! Go to https://ctlscoreboard.herokuapp.com/ to report a match or view live standings."
          );
        }
      }
      // Test channel supports additional commands
      else if (msg.channel.name == this.testChannel) {
        logger.log("got message in test channel, aka", msg.channel.name);

        if (msg.content == "!hi") {
          this.sendMessageInChannel("Greetings traveler!", this.testChannel);
        }

        if (msg.content == "!who") {
          this.sendMessageInChannel(
            `The person who just pinged me is ${msg.author.username}`,
            this.testChannel
          );
        }
      }
    });

    this.client.login(this.token);
  }
}

module.exports = {
  BotClient
};
