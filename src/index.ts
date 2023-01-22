import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
import cron from "node-cron";

dotenv.config();

const octocat = new Octokit({
  auth: process.env.GH_TOKEN,
  userAgent: "mrhappyma's GH bot wrangler",
  timeZone: "America/New_York",
});

cron.schedule("* * * * *", async (date) => {
  const notifications =
    await octocat.rest.activity.listNotificationsForAuthenticatedUser({
      all: true,
      per_page: 3,
    });

  for (let notification of notifications.data) {
    if (notification.reason !== "mention") continue;
    const comment = await octocat.rest.issues.getComment({
      owner: notification.repository.owner.login,
      repo: notification.repository.name,
      comment_id: Number(
        /[^/]*$/.exec(notification.subject.latest_comment_url) ?? ""[0]
      ),
    });
    // the real handling here
    if (!comment.data.body) continue;
    if (comment.data.body.endsWith("close")) {
      if (comment.data.user?.login != process.env.OWNER) continue;
      const issue = await octocat.rest.issues.get({
        owner: notification.repository.owner.login,
        repo: notification.repository.name,
        issue_number: Number(/[^/]*$/.exec(notification.subject.url) ?? ""[0]),
      });
      if (issue.data.state == "closed") continue;
      await octocat.rest.issues.update({
        owner: notification.repository.owner.login,
        repo: notification.repository.name,
        issue_number: Number(/[^/]*$/.exec(notification.subject.url) ?? ""[0]),
        state: "closed",
        state_reason: "completed",
      });
      console.log(`closed ${notification.subject.url}`);
    }
  }
});
