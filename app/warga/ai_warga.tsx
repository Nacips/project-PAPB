import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Markdown from "react-native-markdown-display";
import { chatWithWargaAI } from "../../services/aiWargaService";
import * as Clipboard from "expo-clipboard";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function AIWarga() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Halo! Saya **Desaku AI**, asisten virtual Anda. 🤖\n\nSaya bisa membantu Anda mengecek status pengajuan surat, mengetahui syarat dokumen, atau panduan menggunakan aplikasi. \n\n*Coba tanya: \"Apa saja syarat membuat Surat Keterangan Usaha?\" atau \"Cek status pengajuan surat saya\"*",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText,
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = inputText;
    setInputText("");
    setIsLoading(true);

    const historyForAI = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const aiResponse = await chatWithWargaAI(currentInput, historyForAI);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Berhasil", "Text berhasil di-copy ke clipboard!");
  };

  const markdownStyles = StyleSheet.create({
    body: { 
      color: "#1e293b", 
      fontFamily: "Poppins", 
      fontSize: 14, 
      lineHeight: 22,
    },
    paragraph: { marginBottom: 8 },
    strong: { fontFamily: "Poppins_600SemiBold", color: "#0f172a" },
    em: { fontStyle: "italic", color: "#475569" },
    listUnorderedItem: { marginBottom: 4 },
    listOrderedItem: { marginBottom: 4 },
    
    table: { 
      borderWidth: 1, 
      borderColor: "#e2e8f0", 
      borderRadius: 8, 
      marginBottom: 12,
      overflow: 'visible',
      backgroundColor: "#ffffff",
    },
    thead: { 
      backgroundColor: "#f8fafc",
      flexDirection: "row",
    },
    tbody: {
      flexDirection: "column",
    },
    tr: { 
      flexDirection: "row",
      borderBottomWidth: 1, 
      borderColor: "#f1f5f9",
    },
    th: { 
      fontFamily: "Poppins_600SemiBold", 
      fontSize: 12, 
      color: "#475569", 
      padding: 8,
      flex: 1,
      textAlign: "left",
      borderBottomWidth: 2,
      borderColor: "#e2e8f0",
    },
    td: { 
      fontFamily: "Poppins", 
      fontSize: 12, 
      color: "#334155", 
      padding: 8,
      flex: 1,
      textAlign: "left",
    },
    
    codeInline: { backgroundColor: "#f1f5f9", color: "#6200EE", padding: 2, borderRadius: 4, fontFamily: "monospace" },
    codeBlock: { backgroundColor: "#1e293b", color: "#e2e8f0", padding: 12, borderRadius: 8, fontFamily: "monospace" },
  });

  const renderTextWithCopy = (content: string, isUser: boolean) => {
    return (
      <TouchableOpacity
        onLongPress={() => handleCopyText(content)}
        activeOpacity={0.7}
        delayLongPress={500}
      >
        {isUser ? (
          <Text style={styles.userText} selectable>{content}</Text>
        ) : (
          <Markdown style={markdownStyles}>{content}</Markdown>
        )}
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <MaterialCommunityIcons name="robot-happy" size={20} color="#ffffff" />
          </View>
        )}
        
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {renderTextWithCopy(item.content, isUser)}
        </View>

        {isUser && (
          <View style={styles.userAvatar}>
            <MaterialCommunityIcons name="account" size={20} color="#ffffff" />
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Desaku AI</Text>
          <Text style={styles.headerSubtitle}>Asisten Virtual Warga</Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Online</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.chatContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color="#6200EE" />
              <Text style={styles.typingText}>Sedang memproses...</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Tanyakan syarat surat atau status pengajuan..."
          placeholderTextColor="#94a3b8"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          editable={!isLoading}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          <MaterialCommunityIcons name="send" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: { padding: 8, backgroundColor: "#f1f5f9", borderRadius: 12 },
  headerTitle: { fontSize: 18, fontFamily: "Poppins_600SemiBold", color: "#1e293b" },
  headerSubtitle: { fontSize: 12, fontFamily: "Poppins", color: "#64748b" },
  statusBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "#bbf7d0" },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981", marginRight: 6 },
  statusText: { fontSize: 11, fontFamily: "Poppins_500Medium", color: "#166534" },

  chatContent: { paddingHorizontal: 16, paddingVertical: 20 },
  messageRow: { flexDirection: "row", marginBottom: 16, alignItems: "flex-end" },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start" },
  
  aiAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#6200EE", justifyContent: "center", alignItems: "center", marginRight: 8 },
  userAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#64748b", justifyContent: "center", alignItems: "center", marginLeft: 8 },

  bubble: { 
    maxWidth: "85%",
    padding: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userBubble: { backgroundColor: "#6200EE", borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: "#ffffff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  
  userText: { 
    color: "#ffffff", 
    fontFamily: "Poppins", 
    fontSize: 15,
    lineHeight: 22,
  },

  typingIndicator: { flexDirection: "row", alignItems: "center", marginLeft: 40, marginBottom: 10 },
  typingText: { marginLeft: 8, fontFamily: "Poppins", fontSize: 12, color: "#64748b", fontStyle: "italic" },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingBottom: Platform.OS === "ios" ? 34 : 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontFamily: "Poppins",
    fontSize: 15,
    color: "#1e293b",
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 48,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6200EE",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    elevation: 3,
    shadowColor: "#6200EE",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendBtnDisabled: { backgroundColor: "#cbd5e1" },
});