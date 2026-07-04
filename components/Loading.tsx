import {
    ActivityIndicator,
    StyleSheet,
    View,
} from "react-native";

export default function Loading() {
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color="#1565C0"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});