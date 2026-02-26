<div align="center">

# ServerKit

<img width="700" alt="server-kit" src="https://github.com/user-attachments/assets/bfc59e75-8f90-4674-a222-e18213b628b7" />

**Self-hosted infrastructure, made simple.**

A lightweight, modern server control panel for managing web apps, databases,
Docker containers, and security — without the complexity of Kubernetes
or the cost of managed platforms.

English | [Español](docs/README.es.md) | [中文版](docs/README.zh-CN.md) | [Português](docs/README.pt.md)

<br>

![Linux](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
[![Discord](https://img.shields.io/discord/1470639209059455008?style=for-the-badge&logo=discord&logoColor=white&label=Discord&color=5865F2)](https://discord.gg/93QEWZeHRK)

[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-3776AB.svg?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/react-18-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![Flask](https://img.shields.io/badge/flask-3.0-000000.svg?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![Nginx](https://img.shields.io/badge/nginx-reverse_proxy-009639.svg?style=flat-square&logo=nginx&logoColor=white)](https://nginx.org)
[![Let's Encrypt](https://img.shields.io/badge/SSL-Let's_Encrypt-003A70.svg?style=flat-square&logo=letsencrypt&logoColor=white)](https://letsencrypt.org)

<br>

[Features](#-features) · [Quick Start](#-quick-start) · [Screenshots](#-screenshots) · [Architecture](#-architecture) · [Roadmap](#-roadmap) · [Docs](#-documentation) · [Contributing](#-contributing) · [Discord](#-community)

</div>

---

<p align="center">
  <img alt="Dashboard" width="100%" src="https://github.com/user-attachments/assets/e4382ba7-7b3f-4175-baaf-cc9c782de067" />
</p>

---

## 🎯 Features

### Apps & Containers

🐘 **PHP / WordPress** — PHP-FPM 8.x with one-click WordPress installation

🐍 **Python Apps** — Deploy Flask and Django with Gunicorn

🟢 **Node.js** — PM2-managed applications with log streaming

🐳 **Docker** — Full container and Docker Compose management

🔑 **Environment Variables** — Secure, encrypted per-app variable management

### Infrastructure

🌐 **Domain Management** — Nginx virtual hosts with easy configuration

🔒 **SSL Certificates** — Automatic Let's Encrypt with auto-renewal

🗄️ **Databases** — MySQL/MariaDB and PostgreSQL support

🛡️ **Firewall (UFW)** — Visual firewall rule management

⏰ **Cron Jobs** — Schedule tasks with a visual editor

📁 **File Manager** — Browse and edit files via web interface

📡 **FTP Server** — Manage vsftpd users and access

### Security

🔐 **Two-Factor Auth** — TOTP-based with backup codes

🦠 **Malware Scanning** — ClamAV integration with quarantine

📋 **File Integrity Monitoring** — Detect unauthorized file changes

🚨 **Security Alerts** — Real-time threat notifications

🧱 **Fail2ban & SSH** — Brute force protection and SSH key management

### Monitoring & Alerts

📊 **Real-time Metrics** — CPU, RAM, disk, network monitoring via WebSocket

📈 **Uptime Tracking** — Historical server uptime data

🔔 **Notifications** — Discord, Slack, Telegram, and generic webhooks

🖥️ **Multi-Server** — Agent-based remote server monitoring and management

---

## 🚀 Quick Start

> ⏱️ Up and running in under 2 minutes

### Option 1: One-Line Install (Recommended)

```bash
curl -fsSL https://serverkit.ai/install.sh | bash
```

> Works on Ubuntu 22.04+ and Debian 12+. Sets up everything automatically.

### Option 2: Docker

```bash
git clone https://github.com/jhd3197/ServerKit.git
cd ServerKit
cp .env.example .env       # then edit .env with your secrets
docker compose up -d       # access at http://localhost
```

### Option 3: Manual Installation

See the [Installation Guide](docs/INSTALLATION.md) for step-by-step instructions.

### Requirements

| | Minimum | Recommended |
|---|---------|-------------|
| **OS** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| **CPU** | 1 vCPU | 2+ vCPU |
| **RAM** | 1 GB | 2+ GB |
| **Disk** | 10 GB | 20+ GB |
| **Docker** | 24.0+ | Latest |

---

## 📸 Screenshots

<p align="center">

![Workflow-Builder](https://github.com/user-attachments/assets/fc58beac-5e2c-487e-a37b-eaa6473eb325)

</p>

<details>
<summary><strong>View More Screenshots</strong></summary>

<br>

<p align="center">
  <img alt="Docker" width="100%" src="https://github.com/user-attachments/assets/08fd47b9-778a-4170-8542-ed28579f8a12" />
</p>

<p align="center">
  <img width="100%" alt="Workflow Builder" src="https://github.com/user-attachments/assets/1271f01d-f666-4609-8bc0-22a22c81eaf3" />
</p>

<p align="center">
  <img width="100%" alt="Templates" src="https://github.com/user-attachments/assets/337bcf4a-d5aa-4496-b74a-b66e859304ad" />
</p>

<p align="center">
  <img width="100%" alt="Applications" src="https://github.com/user-attachments/assets/b5bdf80c-4ce1-4de9-b8b9-ae069a17a2b3" />
</p>

<p align="center">
  <img width="100%" alt="Applications Logs"  src="https://github.com/user-attachments/assets/3c397d1e-1452-4111-baae-452fb7bfbed7" />
</p>

</details>

---

## 🏗️ Architecture

```
                          ┌──────────────────┐
                          │     INTERNET     │
                          └────────┬─────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            YOUR SERVER                                    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      NGINX (Reverse Proxy)                          │ │
│  │                         :80 / :443                                  │ │
│  │                                                                     │ │
│  │    app1.com ──┐      app2.com ──┐      api.app3.com ──┐            │ │
│  └───────────────┼─────────────────┼─────────────────────┼─────────────┘ │
│                  │ proxy_pass      │ proxy_pass          │ proxy_pass    │
│                  ▼                 ▼                     ▼               │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      DOCKER CONTAINERS                              │ │
│  │                                                                     │ │
│  │    ┌───────────┐    ┌───────────┐    ┌───────────┐                 │ │
│  │    │ WordPress │    │   Flask   │    │  Node.js  │    ...          │ │
│  │    │   :8001   │    │   :8002   │    │   :8003   │                 │ │
│  │    └─────┬─────┘    └───────────┘    └───────────┘                 │ │
│  └──────────┼──────────────────────────────────────────────────────────┘ │
│             │                                                            │
│             ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        DATABASES                                    │ │
│  │    MySQL :3306    PostgreSQL :5432    Redis :6379                  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

**[View Full Architecture Documentation →](docs/ARCHITECTURE.md)** — Request flow, template system, port allocation, database linking, and troubleshooting.

---

## 🗺️ Roadmap

- [x] Core infrastructure — Flask + React + JWT + WebSocket
- [x] Application management — PHP, Python, Node.js, Docker
- [x] Domain & SSL — Nginx virtual hosts, Let's Encrypt
- [x] Databases — MySQL, PostgreSQL
- [x] File & FTP management
- [x] Monitoring & alerts — Metrics, webhooks, uptime tracking
- [x] Security — 2FA, ClamAV, file integrity, Fail2ban
- [x] Firewall — UFW integration
- [x] Multi-server management — Go agent, centralized dashboard
- [x] Git deployment — Webhooks, auto-deploy, rollback, zero-downtime
- [ ] Backup & restore — S3, Backblaze B2, scheduled backups
- [ ] Email server — Postfix, Dovecot, DKIM/SPF/DMARC
- [ ] Team & permissions — RBAC, audit logging
- [ ] Mobile app — React Native with push notifications
- [ ] Plugin marketplace — Extensions, custom widgets, themes

Full details: [ROADMAP.md](ROADMAP.md)

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, request flow, diagrams |
| [Installation Guide](docs/INSTALLATION.md) | Complete setup instructions |
| [Deployment Guide](docs/DEPLOYMENT.md) | CLI commands and production deployment |
| [API Reference](docs/API.md) | REST API endpoints |
| [Roadmap](ROADMAP.md) | Development roadmap and planned features |
| [Contributing](CONTRIBUTING.md) | How to contribute |

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11, Flask, SQLAlchemy, Flask-SocketIO |
| Frontend | React 18, Vite, LESS |
| Database | SQLite / PostgreSQL |
| Web Server | Nginx, Gunicorn |
| Containers | Docker, Docker Compose |
| Security | ClamAV, TOTP (pyotp), Cryptography |

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

```
fork → feature branch → commit → push → pull request
```

**Priority areas:** Backup implementations, additional notification channels, UI/UX improvements, documentation.

---

## 💬 Community

[![Discord](https://img.shields.io/badge/Discord-Join_Us-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/93QEWZeHRK)

Join the Discord to ask questions, share feedback, or get help with your setup.

---

<div align="center">

**ServerKit** — Simple. Modern. Self-hosted.

[Report Bug](https://github.com/jhd3197/ServerKit/issues) · [Request Feature](https://github.com/jhd3197/ServerKit/issues)

Made with ❤️ by [Juan Denis](https://juandenis.com)

</div>
