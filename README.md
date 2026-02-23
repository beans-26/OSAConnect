# 🛡️ OSA Connect: Managed Violation & Service System

A modern, mobile-responsive web application designed for Office of Student Affairs (OSA) to manage student violations, track community service hours, and streamline guard reporting.

## 🚀 Live Demo
Once you deploy using the buttons below, you will get your own working link!

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/beans-26/OSAConnect&envs=DB_HOST,DB_USER,DB_PASS,DB_NAME,JWT_SECRET)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/beans-26/OSAConnect)

## ✨ Key Features
- **📱 Mobile-First Design**: Optimized for students and guards on the go.
- **🕒 Real-Time Service Timer**: Students can scan QR codes to start/stop their community service sessions.
- **🚨 Guard Reporting**: Quick violation entry with evidence photo support.
- **📊 Admin Dashboard**: Comprehensive stats and student record management.
- **🔐 Secure Access**: JWT-based authentication for Admins, Staff, Guards, and Students.

## 🛠️ How to Finish Your Deployment
If you already pushed to Railway, follow these final steps to get your "Working Link":

1. **Find your URL**: Go to your [Railway Dashboard](https://railway.app/dashboard), click your project, then click the **Settings** tab of your app. Scroll to **Public Networking** and click **Generate Domain**.
2. **Setup Database**: 
   - Click **Add Service** -> **MySQL**.
   - Copy the `MYSQL_URL` from the MySQL "Variables" tab.
   - Paste it into your App's "Variables" tab as `MYSQL_URL`.
3. **Import Data**: Copy the code from `setup.sql` into the Railway MySQL **Data** terminal to create your tables.

## 💻 Local Setup
1. Clone the repo: `git clone https://github.com/beans-26/OSAConnect.git`
2. Install dependencies: `npm install`
3. Configure `.env`:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=yourpassword
   DB_NAME=osaconnect_db
   JWT_SECRET=yoursecret
   PORT=3000
   ```
4. Start the server: `npm start`

---
*Built for OSA Digital Transformation.*
