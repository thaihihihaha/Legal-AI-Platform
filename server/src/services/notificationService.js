/**
 * PHASE 3.6 & 3.7: Notifications, Reminders, and Integrations
 * Email/SMS alerts, recurring reminders, and external integrations
 */

import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';

// ========== Notifications ==========

/**
 * Create and send a notification
 */
export const createAndSendNotification = async ({
  userId,
  title,
  message,
  notificationType,
  relatedDraftId = null,
  actionUrl = null,
  sendEmail = false,
  sendSms = false,
}) => {
  try {
    const notification = {
      id: randomUUID(),
      user_id: userId,
      title,
      message,
      notification_type: notificationType,
      related_draft_id: relatedDraftId,
      action_url: actionUrl,
      is_read: false,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    // Store notification (in a real system, would save to DB)
    // For now, simulate notification storage

    // Send email if requested
    if (sendEmail) {
      await sendEmailNotification(userId, title, message);
    }

    // Send SMS if requested
    if (sendSms) {
      await sendSmsNotification(userId, message);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (userId, limit = 20, unreadOnly = false) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // In a real system, would query from notifications table
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    return {
      id: notificationId,
      is_read: true,
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// ========== Reminders ==========

/**
 * Create a reminder for a draft action
 */
export const createReminder = async ({
  draftId,
  userId,
  reminderType, // review_due, action_required, follow_up
  dueDate,
  message = '',
  isRecurring = false,
  recurrencePattern = null, // daily, weekly, monthly
}) => {
  try {
    const reminder = {
      id: randomUUID(),
      draft_id: draftId,
      user_id: userId,
      reminder_type: reminderType,
      due_date: dueDate,
      message,
      is_recurring: isRecurring,
      recurrence_pattern: recurrencePattern,
      status: 'active',
      created_at: new Date().toISOString(),
      last_sent_at: null,
      next_send_at: dueDate,
    };

    // Store in draft metadata
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (!metadata.reminders) {
      metadata.reminders = [];
    }

    metadata.reminders.push(reminder);

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: { validation_result: metadata },
    });

    return reminder;
  } catch (error) {
    console.error('Error creating reminder:', error);
    throw error;
  }
};

/**
 * Get reminders for a user
 */
export const getUserReminders = async (userId, includeCompleted = false) => {
  try {
    const drafts = await prisma.draftGenerated.findMany({
      select: { id: true, validation_result: true },
      take: 100,
    });

    let reminders = [];

    for (const draft of drafts) {
      const metadata = draft.validation_result || {};
      const draftReminders = metadata.reminders?.filter(r => r.user_id === userId) || [];

      if (!includeCompleted) {
        reminders.push(...draftReminders.filter(r => r.status === 'active'));
      } else {
        reminders.push(...draftReminders);
      }
    }

    return reminders.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  } catch (error) {
    console.error('Error getting user reminders:', error);
    throw error;
  }
};

/**
 * Complete a reminder
 */
export const completeReminder = async (reminderId, draftId) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (metadata.reminders) {
      const reminder = metadata.reminders.find(r => r.id === reminderId);
      if (reminder) {
        reminder.status = 'completed';
        reminder.completed_at = new Date().toISOString();
      }
    }

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: { validation_result: metadata },
    });

    return metadata.reminders?.find(r => r.id === reminderId);
  } catch (error) {
    console.error('Error completing reminder:', error);
    throw error;
  }
};

// ========== Integrations ==========

/**
 * Configure an external integration
 */
export const configureIntegration = async ({
  companyId,
  integrationType, // docusign, salesforce, slack, etc.
  configData, // Contains API keys, endpoints, etc.
  createdBy,
}) => {
  try {
    const integration = {
      id: randomUUID(),
      company_id: companyId,
      integration_type: integrationType,
      config_data: configData,
      is_active: true,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      last_sync_at: null,
      sync_status: 'idle',
    };

    return integration;
  } catch (error) {
    console.error('Error configuring integration:', error);
    throw error;
  }
};

/**
 * Get active integrations for a company
 */
export const getCompanyIntegrations = async (companyId) => {
  try {
    const drafts = await prisma.draftGenerated.findMany({
      where: { company_id: companyId },
      select: { validation_result: true },
      take: 1,
    });

    let integrations = [];

    if (drafts.length > 0) {
      const metadata = drafts[0].validation_result || {};
      integrations = metadata.integrations || [];
    }

    return integrations.filter(i => i.is_active);
  } catch (error) {
    console.error('Error getting company integrations:', error);
    throw error;
  }
};

/**
 * Send draft to DocuSign for signing
 */
export const sendToDocuSign = async ({
  draftId,
  signingEmail,
  signingName,
  integrationConfig,
}) => {
  try {
    // In a real implementation, would call DocuSign API
    // For now, simulate the process

    const sendResult = {
      envelope_id: randomUUID(),
      draft_id: draftId,
      status: 'sent_for_signature',
      sent_to: signingEmail,
      sent_at: new Date().toISOString(),
      docusign_url: `https://app.docusign.com/documents/${randomUUID()}`,
    };

    // Store integration result in draft metadata
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (!metadata.integration_results) {
      metadata.integration_results = [];
    }

    metadata.integration_results.push(sendResult);

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: {
        validation_result: metadata,
        status: 'pending_signature',
      },
    });

    return sendResult;
  } catch (error) {
    console.error('Error sending to DocuSign:', error);
    throw error;
  }
};

/**
 * Sync draft to Salesforce
 */
export const syncToSalesforce = async ({
  draftId,
  opportunityId,
  integrationConfig,
}) => {
  try {
    // Simulate Salesforce sync

    const syncResult = {
      sync_id: randomUUID(),
      draft_id: draftId,
      salesforce_record_id: opportunityId,
      status: 'synced',
      synced_at: new Date().toISOString(),
      fields_synced: ['title', 'status', 'content', 'created_at'],
    };

    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (!metadata.integration_results) {
      metadata.integration_results = [];
    }

    metadata.integration_results.push(syncResult);
    metadata.salesforce_linked = opportunityId;

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: { validation_result: metadata },
    });

    return syncResult;
  } catch (error) {
    console.error('Error syncing to Salesforce:', error);
    throw error;
  }
};

/**
 * Register a webhook for draft events
 */
export const registerWebhook = async ({
  companyId,
  webhookUrl,
  eventTypes = ['draft_created', 'draft_updated', 'draft_signed'],
  createdBy,
}) => {
  try {
    const webhook = {
      id: randomUUID(),
      company_id: companyId,
      webhook_url: webhookUrl,
      event_types: eventTypes,
      is_active: true,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      last_triggered_at: null,
      delivery_status: 'pending_first_delivery',
    };

    return webhook;
  } catch (error) {
    console.error('Error registering webhook:', error);
    throw error;
  }
};

/**
 * Get webhooks for a company
 */
export const getCompanyWebhooks = async (companyId) => {
  try {
    const drafts = await prisma.draftGenerated.findMany({
      where: { company_id: companyId },
      select: { validation_result: true },
      take: 1,
    });

    if (drafts.length === 0) {
      return [];
    }

    const metadata = drafts[0].validation_result || {};
    return metadata.webhooks || [];
  } catch (error) {
    console.error('Error getting webhooks:', error);
    throw error;
  }
};

/**
 * Trigger a webhook event
 */
export const triggerWebhookEvent = async (companyId, eventType, eventData) => {
  try {
    const webhooks = await getCompanyWebhooks(companyId);
    const activeWebhooks = webhooks.filter(
      w => w.is_active && w.event_types.includes(eventType)
    );

    const results = [];

    for (const webhook of activeWebhooks) {
      try {
        // In real implementation, would make actual HTTP POST to webhook URL
        // For now, simulate the delivery

        results.push({
          webhook_id: webhook.id,
          event_type: eventType,
          delivery_status: 'delivered',
          delivered_at: new Date().toISOString(),
          response_status: 200,
        });
      } catch (error) {
        results.push({
          webhook_id: webhook.id,
          event_type: eventType,
          delivery_status: 'failed',
          error: error.message,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error triggering webhook:', error);
    throw error;
  }
};

// ========== Helper Functions ==========

async function sendEmailNotification(userId, title, message) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) return;

    // In a real system, would send actual email via SendGrid, AWS SES, etc.
    console.log(`[EMAIL] To: ${user.email}, Subject: ${title}, Message: ${message}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

async function sendSmsNotification(userId, message) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    if (!user?.phone) return;

    // In a real system, would send actual SMS via Twilio, etc.
    console.log(`[SMS] To: ${user.phone}, Message: ${message}`);
  } catch (error) {
    console.error('Error sending SMS:', error);
  }
}
