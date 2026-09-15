import cron from "node-cron";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

/**
 * Atomically claim the next due scheduled post.
 * Uses findOneAndUpdate to transition status from "scheduled" to "publishing"
 * and sets claimedAt to the current timestamp.
 * Returns the updated post if claimed, or null if no post was claimable.
 */
export const claimNextDuePost = async (now = new Date()) => {
  return await Post.findOneAndUpdate(
    {
      status: "scheduled",
      scheduledAt: { $lte: now }
    },
    {
      $set: {
        status: "publishing",
        claimedAt: now
      }
    },
    {
      returnDocument: "after"
    }
  );
};

/**
 * Publish a claimed post:
 * 1. Validate author if mentions exist (delete orphaned post if author gone)
 * 2. Set status to published and clear claimedAt
 * 3. Send deferred mention notifications
 * 4. On failure prior to notifications, safely restore status to scheduled
 */
export const publishClaimedPost = async (post) => {
  let notificationsSent = false;
  try {
    let notifications = [];
    if (post.mentions && post.mentions.length > 0) {
      const author = await User.findById(post.userId).select("username");
      if (!author) {
        await Post.findByIdAndDelete(post._id);
        return;
      }
      notifications = post.mentions
        .filter(mId => mId.toString() !== post.userId.toString())
        .map(mentionedId => ({
          recipient: mentionedId,
          sender: post.userId,
          type: "mention",
          post: post._id,
          message: `${author.username} mentioned you in a post`
        }));
    }

    post.status = "published";
    post.claimedAt = null;
    await post.save();

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      notificationsSent = true;
    }

    console.log(`[Scheduler] Published post ${post._id} by user ${post.userId}`);
  } catch (error) {
    console.error(`[Scheduler] Failed to publish post ${post._id}:`, error);
    // If publishing failed and notifications were definitely NOT sent,
    // safely restore status to "scheduled" so it can be retried cleanly.
    if (!notificationsSent) {
      try {
        await Post.findByIdAndUpdate(post._id, {
          $set: { status: "scheduled", claimedAt: null }
        });
      } catch (restoreError) {
        console.error(`[Scheduler] Failed to restore post ${post._id} to scheduled:`, restoreError);
      }
    }
  }
};

export const publishPost = publishClaimedPost;

/**
 * Process all currently due scheduled posts using atomic claims.
 * Repeatedly claims and publishes one post at a time until no claimable posts remain.
 */
export const processScheduledPosts = async () => {
  let processedCount = 0;
  while (true) {
    const post = await claimNextDuePost();
    if (!post) {
      break;
    }
    processedCount++;
    await publishClaimedPost(post);
  }
  return processedCount;
};

/**
 * Check for overdue scheduled posts (missed by cron, e.g. server was down).
 * Safe across concurrent multi-pod server startups.
 */
export const catchUpOverduePosts = async () => {
  try {
    const processedCount = await processScheduledPosts();
    if (processedCount > 0) {
      console.log(`[Scheduler] Caught up ${processedCount} overdue scheduled post(s)`);
    }
  } catch (error) {
    console.error("[Scheduler] Catch-up error:", error);
  }
};

let isSchedulerRunning = false;

export const startScheduler = () => {
  cron.schedule("* * * * *", async () => {
    if (isSchedulerRunning) return;
    isSchedulerRunning = true;
    try {
      await processScheduledPosts();
    } catch (error) {
      console.error("[Scheduler] Cron error:", error);
    } finally {
      isSchedulerRunning = false;
    }
  });

  console.log("[Scheduler] Cron job started (runs every 60 seconds)");
};

