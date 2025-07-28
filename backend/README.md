# SplitWise Backend API

Backend API pour l'application SplitWise de gestion des dépenses partagées.

## 🚀 Technologies

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MySQL** - Base de données
- **JWT** - Authentification
- **bcryptjs** - Hachage des mots de passe
- **Joi** - Validation des données

## 📋 Prérequis

- Node.js (v14 ou supérieur)
- MySQL (v8.0 ou supérieur)
- npm ou yarn

## ⚙️ Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd backend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration de l'environnement**
```bash
cp .env.example .env
```

Modifier le fichier `.env` avec vos paramètres :
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=splitwise_db
DB_USER=root
DB_PASSWORD=your_password

JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

4. **Créer la base de données**
```sql
CREATE DATABASE splitwise_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. **Exécuter les migrations**
```bash
npm run migrate
```

6. **Démarrer le serveur**
```bash
# Mode développement
npm run dev

# Mode production
npm start
```

## 📚 API Endpoints

### 🔐 Authentification (`/api/auth`)

- `POST /register` - Inscription
- `POST /login` - Connexion
- `GET /me` - Profil utilisateur
- `PUT /profile` - Mise à jour du profil

### 👥 Groupes (`/api/groups`)

- `GET /` - Liste des groupes
- `POST /` - Créer un groupe
- `GET /:id` - Détails d'un groupe
- `PUT /:id` - Modifier un groupe
- `DELETE /:id` - Supprimer un groupe
- `POST /:id/members` - Ajouter un membre
- `DELETE /:id/members/:userId` - Supprimer un membre

### 💰 Dépenses (`/api/expenses`)

- `GET /group/:groupId` - Dépenses d'un groupe
- `POST /` - Créer une dépense
- `PUT /:id` - Modifier une dépense
- `DELETE /:id` - Supprimer une dépense
- `GET /group/:groupId/balances` - Soldes du groupe

### 💳 Paiements (`/api/payments`)

- `GET /` - Historique des paiements
- `POST /` - Créer un paiement
- `GET /refunds` - Historique des remboursements
- `POST /refunds` - Demander un remboursement
- `PUT /refunds/:id` - Mettre à jour un remboursement

### 📊 Analyses (`/api/analytics`)

- `GET /overview` - Vue d'ensemble
- `GET /expenses-by-category` - Dépenses par catégorie
- `GET /monthly-trends` - Tendances mensuelles
- `GET /top-spenders` - Plus gros dépensiers
- `GET /groups/:groupId` - Analyses d'un groupe

## 🗄️ Structure de la base de données

### Tables principales

- **users** - Utilisateurs
- **groups_table** - Groupes
- **group_members** - Membres des groupes
- **expenses** - Dépenses
- **expense_participants** - Participants aux dépenses
- **payments** - Paiements
- **refunds** - Remboursements

## 🔒 Sécurité

- **Helmet** - Protection des en-têtes HTTP
- **Rate Limiting** - Limitation du taux de requêtes
- **CORS** - Configuration des origines autorisées
- **JWT** - Authentification par tokens
- **bcryptjs** - Hachage sécurisé des mots de passe
- **Joi** - Validation des données d'entrée

## 🧪 Tests

```bash
# Tester la connexion à la base de données
npm run migrate

# Vérifier l'état du serveur
curl http://localhost:5000/health
```

## 📝 Exemples d'utilisation

### Inscription
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "full_name": "John Doe"
  }'
```

### Créer un groupe
```bash
curl -X POST http://localhost:5000/api/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Voyage à Paris",
    "description": "Dépenses du weekend",
    "currency": "EUR"
  }'
```

### Ajouter une dépense
```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "group_id": 1,
    "description": "Restaurant",
    "amount": 85.50,
    "currency": "EUR",
    "category": "Restaurant",
    "date": "2024-01-15",
    "paid_by": 1,
    "participants": [
      {"user_id": 1, "amount_owed": 28.50},
      {"user_id": 2, "amount_owed": 28.50},
      {"user_id": 3, "amount_owed": 28.50}
    ]
  }'
```

## 🚀 Déploiement

1. **Variables d'environnement de production**
```env
NODE_ENV=production
DB_HOST=your_production_db_host
JWT_SECRET=your_production_jwt_secret
```

2. **Build et démarrage**
```bash
npm install --production
npm start
```

## 📞 Support

Pour toute question ou problème, veuillez créer une issue dans le repository.