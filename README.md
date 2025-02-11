# me.json – The Digital Representation of a Person

**me.json** is a structured data format designed to serve as a centralized source of personal but non-sensitive information. It provides a standardized and machine-readable way to store details about a person, including biographical data, interests, professional history, and online presence.

## 🌟 Idea & Motivation

Today, personal information is scattered across various platforms – from social media profiles to resumes and private notes. **me.json** creates a unified, easily accessible structure to consolidate this data and use it flexibly.

### 💡 Use Cases

- **Digital Business Card**: Present your professional and personal details in a standardized format.
- **Automated Profiles**: Use the data for websites, APIs, or other digital platforms.
- **Backup & Portability**: Keep your information up-to-date and transportable, independent of specific services.

## 📚 What’s Included in me.json?

The file contains information such as:

- 🌿 **Name & Contact Info** (Email, Phone Number)
- 🌍 **Citizenship & Location**
- 🏢 **Professional Background & Memberships**
- 🎨 **Hobbies & Interests**
- 🎶 **Favorite Music, Movies & Games**
- 🔗 **Online Profiles & Personal Links**

## ⚙️ Environment Configuration

To run this application successfully, create a `.env` file with the following environment variables:

```
PORT=3000
NODE_ENV=development  # or 'production' depending on the environment
DB_USER=your_database_user
DB_HOST=your_database_host
DB_NAME=your_database_name
DB_PASSWORD=your_database_password
DB_PORT=your_database_port
```

Ensure all required values are set correctly before running the application.

## 🎦 API Endpoints

The **me.json** API provides the following endpoints to interact with user data:

### 🔍 Get User Data

#### **GET /**

- Returns an error if no user ID is provided.
- Example Response:
  ```json
  {
    "error": "Bad Request",
    "details": "Please provide at least a user ID, or request /users to get a list of available user IDs."
  }
  ```

#### **GET /schema**

- Retrieves the latest JSON schema used for me.json.
- Example Request:
  ```sh
  curl -X GET http://localhost:3000/schema
  ```
- Example Response:
  ```json
  {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "email": { "type": "string" }
    }
  }
  ```

#### **GET /users**

- Retrieves a list of all available user IDs.
- Example Request:
  ```sh
  curl -X GET http://localhost:3000/users
  ```
- Example Response:
  ```json
  {
    "userIDs": ["abc123", "xyz789"]
  }
  ```

#### **GET /:id**

- Retrieves the entire dataset for the specified user ID.
- Example Request:
  ```sh
  curl -X GET http://localhost:3000/123
  ```
- Example Response:
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
  ```

#### **GET /:id/\* (Nested Data Retrieval)**

- Retrieves a specific data field for the given user ID using a key path.
- Example Request:
  ```sh
  curl -X GET http://localhost:3000/123/email
  ```
- Example Response:
  ```json
  {
    "email": "john.doe@example.com"
  }
  ```
- If the key does not exist, returns an error:
  ```json
  {
    "error": "The key path 'email' does not exist in user 123's data."
  }
  ```

### 🛠️ Create a New User

#### **POST /users**

- Saves a new user profile in the database.
- Example Request:
  ```sh
  curl -X POST http://localhost:3000/users \
       -H "Content-Type: application/json" \
       -d '{"name": "John Doe", "email": "john.doe@example.com"}'
  ```
- Example Response:
  ```json
  {
    "id": "abc123",
    "data": {
      "name": "John Doe",
      "email": "john.doe@example.com"
    }
  }
  ```
- If no JSON data is provided, returns an error:
  ```json
  {
    "error": "Bad Request",
    "details": "No JSON payload provided."
  }
  ```

## 🚀 Future Vision

The goal of **me.json** is to define a flexible and open standard that can be easily extended. In the long run, it could be used for **automated profile generation**, **personal assistants**, or **self-managed digital identities**.

## 🐟 License

This project is released under the [MIT License](LICENSE), allowing you to freely use, modify, and further develop it.
