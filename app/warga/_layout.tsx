import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function WargaLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0284c7",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e5e7eb",
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarIcon: () => <Text style={{ fontSize: 24 }}>🏠</Text> }}
      />
      <Tabs.Screen
        name="pengajuan_surat"
        options={{ title: "Ajukan", tabBarIcon: () => <Text style={{ fontSize: 24 }}>📝</Text> }}
      />
      <Tabs.Screen
        name="riwayat_surat"
        options={{ title: "Riwayat", tabBarIcon: () => <Text style={{ fontSize: 24 }}>📋</Text> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: "Profil", tabBarIcon: () => <Text style={{ fontSize: 24 }}>👤</Text> }}
      />
    </Tabs>
  );
}