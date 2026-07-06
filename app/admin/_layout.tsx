import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#6200ee",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e5e7eb",
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="penduduk"
        options={{
          title: "Penduduk",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>👥</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="jenis_surat"
        options={{
          title: "Jenis Surat",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>📄</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="verifikasi_surat"
        options={{
          title: "Verifikasi",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>✅</Text>
          ),
        }}
      />
    </Tabs>
  );
}