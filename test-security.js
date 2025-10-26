// Тестовий скрипт для перевірки функцій безпеки
const API_BASE_URL = "http://164.92.182.162:8000";

// Тестові дані
const testData = {
  allowedIP: "192.168.1.100",
  allowedIPDesc: "Тестовий офіс",
  blockedIP: "192.168.1.200", 
  blockedIPReason: "Тестове блокування"
};

async function testSecurityAPI() {
  console.log("🔒 Тестування API безпеки...");
  
  try {
    // Тест 1: Перевірка статистики безпеки
    console.log("\n1️⃣ Тестування статистики безпеки:");
    const statsResponse = await fetch(`${API_BASE_URL}/security/stats`);
    console.log("Статус:", statsResponse.status);
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log("✅ Статистика безпеки:", stats);
    } else {
      console.log("❌ Помилка отримання статистики");
    }
    
    // Тест 2: Перевірка дозволених IP
    console.log("\n2️⃣ Тестування дозволених IP:");
    const allowedResponse = await fetch(`${API_BASE_URL}/security/allowed-ips`);
    console.log("Статус:", allowedResponse.status);
    if (allowedResponse.ok) {
      const allowed = await allowedResponse.json();
      console.log("✅ Дозволені IP:", allowed);
    } else {
      console.log("❌ Помилка отримання дозволених IP");
    }
    
    // Тест 3: Перевірка заблокованих IP
    console.log("\n3️⃣ Тестування заблокованих IP:");
    const blockedResponse = await fetch(`${API_BASE_URL}/security/blocked-ips`);
    console.log("Статус:", blockedResponse.status);
    if (blockedResponse.ok) {
      const blocked = await blockedResponse.json();
      console.log("✅ Заблоковані IP:", blocked);
    } else {
      console.log("❌ Помилка отримання заблокованих IP");
    }
    
    // Тест 4: Перевірка активних сесій з геолокацією
    console.log("\n4️⃣ Тестування активних сесій:");
    const sessionsResponse = await fetch(`${API_BASE_URL}/sessions`);
    console.log("Статус:", sessionsResponse.status);
    if (sessionsResponse.ok) {
      const sessions = await sessionsResponse.json();
      console.log("✅ Активні сесії:", sessions);
    } else {
      console.log("❌ Помилка отримання сесій");
    }
    
    console.log("\n🎉 Тестування завершено!");
    
  } catch (error) {
    console.error("💥 Помилка тестування:", error);
  }
}

// Запуск тестів
if (typeof window !== 'undefined') {
  // В браузері
  window.testSecurityAPI = testSecurityAPI;
  console.log("🔒 Тестовий скрипт завантажено. Викличте testSecurityAPI() для запуску тестів.");
} else {
  // В Node.js
  testSecurityAPI();
}

