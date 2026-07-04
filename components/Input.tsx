import { StyleSheet, TextInput } from "react-native";

interface Props {
  placeholder: string;
  value: string;
  secureTextEntry?: boolean;
  onChangeText: (text: string) => void;
}

export default function Input({
  placeholder,
  value,
  secureTextEntry,
  onChangeText,
}: Props) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      value={value}
      secureTextEntry={secureTextEntry}
      onChangeText={onChangeText}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
  },
});