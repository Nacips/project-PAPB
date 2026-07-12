import { Tabs, router, usePathname } from "expo-router";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function AdminLayout() {
  const pathname = usePathname();
  
  const showFAB = pathname !== "/admin/ai_assistant";

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#6200EE",
          tabBarInactiveTintColor: "#94a3b8",
          tabBarHideOnKeyboard: true,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Beranda",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons 
                name={focused ? "view-dashboard" : "view-dashboard-outline"} 
                size={26} 
                color={color} 
              />
            ),
          }}
        />
        
        <Tabs.Screen
          name="penduduk"
          options={{
            title: "Penduduk",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons 
                name={focused ? "account-group" : "account-group-outline"} 
                size={26} 
                color={color} 
              />
            ),
          }}
        />
        
        <Tabs.Screen
          name="jenis_surat"
          options={{
            title: "Jenis Surat",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons 
                name={focused ? "file-document-multiple" : "file-document-multiple-outline"} 
                size={26} 
                color={color} 
              />
            ),
          }}
        />
        
        <Tabs.Screen
          name="generate_template_ai"
          options={{
            title: "AI Surat",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons 
                name={focused ? "robot-happy" : "robot-outline"} 
                size={26} 
                color={color} 
              />
            ),
          }}
        />
        
        <Tabs.Screen
          name="verifikasi_surat"
          options={{
            title: "Verifikasi",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons 
                name={focused ? "check-decagram" : "check-decagram-outline"} 
                size={26} 
                color={color} 
              />
            ),
          }}
        />
        
        <Tabs.Screen
          name="profil"
          options={{
            title: "Profil",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons 
                name={focused ? "account-circle" : "account-circle-outline"} 
                size={26} 
                color={color} 
              />
            ),
          }}
        />

        <Tabs.Screen name="laporan" options={{ href: null }} />
        <Tabs.Screen name="pengaturan" options={{ href: null }} />
        <Tabs.Screen name="cetak_surat" options={{ href: null }} />
        
        <Tabs.Screen name="ai_assistant" options={{ href: null }} />
      </Tabs>

      {showFAB && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => router.push("/admin/ai_assistant")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="robot-happy" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    paddingTop: 10,
    height: Platform.OS === "ios" ? 85 : 70,
    elevation: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 10,
  },
  tabBarLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10,
    marginTop: 2,
  },
  fab: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 85, 
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6200EE",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#6200EE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  }
});