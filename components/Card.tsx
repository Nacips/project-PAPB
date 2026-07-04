import { StyleSheet, View } from "react-native";

export default function Card({
  children,
}: any) {
  return (
    <View style={styles.card}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginVertical: 10,
    elevation: 3,
  },
});