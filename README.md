# GuardianAI Safety Hub

Build a complete GuardianAI women-safety app using Lovable's native stack.

Use:

* Lovable native Auth
* Lovable native Database
* Lovable Edge Function
* Brevo SMTP for real email sending

Do NOT use Java, Spring Boot, Render, GatewayAPI, SMS, WebSocket or any separate backend.

### Main Flow

Register → Login → Dashboard → Add Trusted Contacts → Press SOS → Get Location → Save Emergency Event → Send Email through Brevo SMTP.

### Trusted Contacts

Users can:

* Add name and email
* Edit contact
* Delete contact
* Enable/disable notifications

### SOS

When SOS is pressed:

* Get browser location.
* Save latitude and longitude if available.
* Create an emergency event.
* Send a real email to every enabled trusted contact through Brevo SMTP.
* If location is unavailable, still send the email.
* Show whether email was successfully sent.

### Brevo SMTP

Use these secrets:

BREVO_SMTP_HOST = smtp-relay.brevo.com
BREVO_SMTP_PORT = 587
BREVO_SMTP_USER = [my Brevo SMTP login]
BREVO_SMTP_PASSWORD = [my Brevo SMTP password]
BREVO_FROM_EMAIL = [my verified Brevo sender email]

Do not put SMTP credentials in frontend code.

Email:
From: GuardianAI
Subject: GuardianAI Emergency Alert

Include:

* User name
* Emergency message
* Risk: CRITICAL
* Date/time
* Latitude/longitude
* Google Maps location link when available

### Dashboard

Show:

* User name
* Big SOS button
* Trusted Contacts
* Recent Emergency Events
* Email notification status
* Logout

Make the UI clean, modern and mobile responsive.

Everything should be functional. Do not use mock or fake email responses.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://guardianai-safetyhub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c17667fa-983e-4863-8999-c1d276f5417e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
