import { StyleSheet, Text, TouchableOpacity } from "react-native";
import Colors from "../constants/colors";

interface Props {
  title: string;
  onPress: () => void;
}

export default function Button({
  title,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },

  text: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
});