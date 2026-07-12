import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";

const { width } = Dimensions.get("window");

export default function Splash() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [redirectRoute, setRedirectRoute] = useState<string | null>(null);

  const fadeAnimLogo = useRef(new Animated.Value(0)).current;
  const fadeAnimOnboard = useRef(new Animated.Value(0)).current;
  
  const slideAnim = useRef(new Animated.Value(0)).current;

  const BUTTON_WIDTH = width - 60; 
  const KNOB_WIDTH = 48;
  const PADDING = 6;
  const MAX_SLIDE = BUTTON_WIDTH - KNOB_WIDTH - (PADDING * 2);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        let newX = gestureState.dx;
        if (newX < 0) newX = 0;
        if (newX > MAX_SLIDE) newX = MAX_SLIDE;
        slideAnim.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > MAX_SLIDE * 0.6) {
          Animated.timing(slideAnim, {
            toValue: MAX_SLIDE,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            handleMulai();
          });
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            setRedirectRoute(role === "admin" ? "/admin/dashboard" : "/warga/dashboard");
          } else {
            setRedirectRoute("/login");
          }
        } catch (error) {
          setRedirectRoute("/login");
        }
      } else {
        setRedirectRoute("/login");
      }
    });

    Animated.sequence([
      Animated.timing(fadeAnimLogo, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnimLogo, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowOnboarding(true);
      Animated.timing(fadeAnimOnboard, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe();
  }, []);

  const handleMulai = () => {
    if (redirectRoute) {
      router.replace(redirectRoute as any);
    } else {
      router.replace("/login");
    }
  };

  return (
    <View style={styles.container}>
      {!showOnboarding && (
        <Animated.View style={[styles.splashScreen, { opacity: fadeAnimLogo }]}>
          <Image
            source={require("../assets/logo/logo-tanpa-teks-1.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Desaku</Text>
          <Text style={styles.jargon}>Layanan Desa dalam Genggaman</Text>
        </Animated.View>
      )}

      {showOnboarding && (
        <Animated.View style={[styles.onboardContainer, { opacity: fadeAnimOnboard }]}>
          <ImageBackground
            source={require("../assets/images/bg-1.jpeg")}
            style={styles.bgImage}
          >
            <View style={styles.overlay}>
              <View style={styles.content}>
                <View style={styles.iconContainer}>
                  <Image
                    source={require("../assets/logo/logo-tanpa-teks-1.png")}
                    style={styles.logoSmall}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.onboardTitle}>E-Surat Desa</Text>
                <Text style={styles.onboardDesc}>
                  Urus surat menyurat lebih mudah, transparan, dan cepat langsung dari genggaman Anda.
                </Text>
              </View>

              <View style={styles.footer}>
                <View style={styles.slideButton}>
                  <Text style={styles.slideText}>Geser untuk Mulai</Text>
                  
                  <Animated.View
                    style={[
                      styles.slideKnob,
                      { transform: [{ translateX: slideAnim }] },
                    ]}
                    {...panResponder.panHandlers}
                  >
                    <Text style={{ fontSize: 20, color: "#6200EE" }}>➔</Text>
                  </Animated.View>
                </View>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A12" },
  splashScreen: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A0A12" },
  logo: { width: 120, height: 120, marginBottom: 20 },
  appName: { fontSize: 32, fontFamily: "Poppins_500Medium", color: "#ffffff", marginBottom: 8 },
  jargon: { fontSize: 14, fontFamily: "Poppins", color: "#8E8E93", letterSpacing: 1 },
  
  onboardContainer: { flex: 1 },
  bgImage: { flex: 1, width: "100%", height: "100%" },
  overlay: { flex: 1, backgroundColor: "rgba(10, 10, 18, 0.75)", justifyContent: "space-between" },
  content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 30 },
  
  iconContainer: {
    width: 130, 
    height: 130, 
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 30, 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 35,
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,1)",
    elevation: 10,
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
  },
  logoSmall: { width: 90, height: 90 },
  
  onboardTitle: { fontSize: 28, fontFamily: "Poppins_500Medium", color: "#ffffff", textAlign: "center", marginBottom: 12 },
  onboardDesc: { fontSize: 14, fontFamily: "Poppins", color: "#D1D1D6", textAlign: "center", lineHeight: 22 },
  
  footer: { padding: 30, paddingBottom: 50 },
  
  slideButton: {
    backgroundColor: "#6200EE",
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    padding: 6,
    position: "relative",
  },
  slideKnob: {
    width: 48, 
    height: 48, 
    backgroundColor: "#ffffff", 
    borderRadius: 24,
    justifyContent: "center", 
    alignItems: "center",
    position: "absolute",
    left: 6,
    zIndex: 1,
    elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
  },
  slideText: {
    textAlign: "center", 
    color: "#ffffff",
    fontFamily: "Poppins_500Medium", 
    fontSize: 16, 
  },
});