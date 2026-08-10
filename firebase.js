require("dotenv").config();
const admin = require("firebase-admin");

const serviceAccount = {
  type: "service_account",
  project_id: "royal-group-e1b39",
  private_key_id: "1fe453b79db3dad1feb92a596d35c15c8bb3d9af",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCuZgnZmAz8u+MA\nDMgF6gfVZIFWRwWJx30Rf8niNwJ9VpVtchu6B68iYfKhHM+nCloSoEG8SRTcmuJ7\nQQrbuB/N2327fW9YoibXnjpew9L3FbXwQO09lXD3lANrYHpfZQHGD1R6s540giNm\nHQrX61KOHBN/wKO49iwX+Cp4Lpt/tON09JJtotJ3akAmzSPs0GH9J8JjJR/VC4vb\nFUQHeWkWkyk7HlGXFAmOft0jTP2GlkI/RrncAYTFIMisURtEzc7NAm6S5Aaf0Ljn\nZxS5BbbCMq4uGidK4tGxSUqAoiVWtfx0VxjBjliC8ofitpfwpfU1DyXlChUhmXvA\nfTyMSjIBAgMBAAECggEALzoztai+75wj22oaqrtXNrr6aXZfMhIDNP9xmOCDvJR7\nb8GEb6rQCxQSQ/4M37Pmc3/RfV8fFqSc63rQKXMhrbogQOs1gX+b3C0dqncGROIs\nvGygslorVuhOyr+8M+QjCFMzcez9TUPmuSrpOlKgLxq8Tw7IZ3jGtRD/0z7v3jOY\nCvA3zrL7Ka/cR4T565pLIsrDONu799bb+oJCKD6i5hKasWeUQGaNlagTqid/kvMo\njx4pPgDBSNiLnjVOkNGlbvvwqMc4hAtYRYOylNgliMcOyDOI4mSSUBw7b6dgvKAt\njhPj6bXXCdU2jbmTq9Dy0b/0YdkxX5E0bc1DSg2qJwKBgQDdUkdW2/nZjQbU0YlV\nMK9SDEhftklaE6N\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@royal-group-e1b39.iam.gserviceaccount.com",
  client_id: "100236054176211832049",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/serviceaccounts/v1/metadata/x509/firebase-adminsdk-fbsvc%40royal-group-e1b39.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;