# CignalCare+

### A Web-Based Customer Support, Troubleshooting, and Prepaid Management System for Cable Service Operations

**CignalCare+** is a web-based service management and customer support system developed to help organize cable service operations. It provides a centralized platform where customers can submit service concerns, access troubleshooting assistance, request technician support, manage prepaid load requests, receive notifications, and communicate with administrators.

The system also provides administrators with tools for customer management, ticket handling, technician request processing, prepaid load management, transaction monitoring, reporting, and system analytics.

> **Project Status:** Deployed  
> **Live System:** https://it-322-capstone-cignal-care.vercel.app/

---

## Project Team

- **Descallar, Loyd Kristian Gonzales.** 
- **Bello, John Paul Sedoro.**
- **Delos Santos, Maricar Relevo.**

---

## System Users

### Administrator
Manages customers, tickets, technician requests, troubleshooting content, prepaid load plans, transactions, notifications, reports, and system analytics.

### Subscriber / Customer
Accesses account information, submits service concerns, communicates through support chat, uses troubleshooting guides, requests technician assistance, submits prepaid load requests, and monitors request history and notifications.

---

## Core Features

- User authentication and account verification
- Customer account management
- Ticketing and service concern management
- Customer–administrator support chat
- Image attachments through Cloudinary
- Guided troubleshooting assistance
- Technician service request processing
- Dynamic prepaid load plan management
- PayMongo payment gateway integration
- Prepaid load request and history tracking
- Admin-side POS and transaction processing
- Notifications and request status updates
- Customer archive and restoration
- Reports, analytics, and transaction monitoring

---

## Technology Stack

### Frontend
- React.js
- Vite
- Tailwind CSS

### Backend
- Node.js
- Express.js
- RESTful API
- JWT-based authentication

### Integrations
- PayMongo — online payment processing
- Cloudinary — image storage and upload management

### Development Tools
- Visual Studio Code
- Figma
- Git
- GitHub

### Deployment
- Vercel — frontend deployment
- Render — backend deployment
- Relational database deployment environment

> The project originally used MySQL during development and later underwent database migration and production deployment preparation as part of the final integration stage.

---

## System Architecture

CignalCare+ follows a full-stack client-server architecture:

1. The **React frontend** provides the customer and administrator interfaces.
2. The **Node.js and Express.js backend** handles business logic, authentication, API requests, and third-party integrations.
3. The **database** stores customer, ticket, transaction, load request, notification, and service-related records.
4. **Cloudinary** manages uploaded images used by supported system features.
5. **PayMongo** handles online payment processing for supported prepaid load transactions.

---

## Repository and Contribution Tracking

The development of CignalCare+ was tracked through individual GitHub branches to document the contributions of each team member during the development period.

| Team Member | Branch |
|---|---|
| Descallar, Loyd Kristian G. | [`Loyd`](https://github.com/loyddescallar/IT322-Capstone-CignalCare/tree/Loyd) |
| Bello, John Paul S. | [`Bello`](https://github.com/loyddescallar/IT322-Capstone-CignalCare/tree/Bello) |
| Delos Santos, Maricar R. | [`Marimar`](https://github.com/loyddescallar/IT322-Capstone-CignalCare/tree/Marimar) |

The individual branches contain the development contributions recorded during the tracked development period, while the [`main`](https://github.com/loyddescallar/IT322-Capstone-CignalCare/tree/main) branch contains the complete integrated version of the system.

---

# Development Journey

## Week 1 — Planning and Technology Review

The team reviewed the existing CignalCare+ system and planned how the completed Figma prototype would be integrated into the current project. The group also evaluated whether to use a new architecture and technology stack but decided to retain the existing stack for the system upgrade.

- Reviewed the existing system and Figma prototype
- Planned the integration and upgrade process
- Evaluated the system architecture and technology stack
- Retained the existing development stack

## Week 2 — Frontend Integration

The team began applying the improvements designed in Figma to the existing system. The main focus was upgrading the user and administrator interfaces while keeping the existing system functions connected.

- Integrated the Figma prototype into the current system
- Improved the user-side interface
- Improved the administrator-side interface
- Updated layouts, navigation, and overall user experience

## Week 3 — Backend Foundation and Development

The backend folder structure was initialized to establish the foundation of the updated backend. The team then continued developing and completing the required backend files, features, and frontend-to-backend connections.

- Established the backend project structure
- Developed routes, controllers, models, and API connections
- Continued completing backend features
- Connected frontend modules with backend services

## Week 4 — System Enhancement and Third-Party Integration

The team continued testing, polishing, and upgrading the system. Cloudinary was integrated for image storage, while PayMongo was introduced as the payment gateway for supported prepaid load transactions.

- Continued system polishing and feature improvements
- Performed feature testing and bug fixing
- Integrated Cloudinary for image storage
- Integrated PayMongo for payment processing

## Week 5 — Final Integration and Deployment

The final week focused on system-wide testing, code cleanup, connection checking, and deployment preparation. The completed modules were integrated into the final system, the repository was updated, and the project was deployed using cloud-based services.

- Conducted final testing and system polishing
- Cleaned unused and redundant code
- Verified connections between frontend and backend modules
- Prepared the database for the production environment
- Uploaded the complete integrated system to the repository
- Deployed the frontend and backend using Vercel and Render

---

## Development Journal

The team's development progress, daily activities, and individual contributions were documented throughout the five-week development period.

**Development Journal:**  
https://drive.google.com/drive/folders/1DYvqPmUZRWRtKeNEozqitaqbxSKaYFDw?usp=sharing

---

## Project Links

- **GitHub Repository:** https://github.com/loyddescallar/IT322-Capstone-CignalCare
- **Live System:** https://it-322-capstone-cignal-care.vercel.app/
- **Development Journal:** https://drive.google.com/drive/folders/1DYvqPmUZRWRtKeNEozqitaqbxSKaYFDw?usp=sharing

---

## Project Status

CignalCare+ has completed its five-week tracked development cycle and is currently deployed. Further maintenance, revisions, and improvements may continue through the team's branch-based development workflow.
