# System Diagram

```mermaid
graph TD
    subgraph Frontend [Next.js Dashboard]
        UI[Brutalist UI Components]
        Context[Auth Context]
        SocketClient[Socket.io Client]
    end

    subgraph Backend [Node.js API Server]
        Middleware[Auth Middleware / Rate Limiter]
        Router[Express Routers]
        Controller[Business Logic Controllers]
        SocketServer[Socket.io Server]
    end

    subgraph Database [MongoDB Cluster]
        UserColl[(Users)]
        MsgColl[(Messages)]
        LeadColl[(Leads)]
    end

    UI -->|Axios Request| Middleware
    Middleware -->|Verified| Router
    Router --> Controller
    Controller -->|Query/Update| Database
    Controller -->|Real-time Emit| SocketServer
    SocketServer -->|Push Notification| SocketClient
    SocketClient -->|Update| UI
```

## System Interaction Logic
1. **User Action**: Personnel logs in.
2. **Backend**: Validates credentials, generates JWT.
3. **Frontend**: Stores token, connects to Socket server.
4. **Operations**: Any data change (Task completion, Message sent) triggers both a DB update and a Socket emission to relevant nodes.
