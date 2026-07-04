import { StyleSheet, Text, View } from "react-native";
import Colors from "../constants/colors";

interface Props {
  title: string;
}

export default function Header({
  title,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    padding: 18,
    alignItems: "center",
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});