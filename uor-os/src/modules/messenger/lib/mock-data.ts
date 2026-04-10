export interface Contact {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  status: "online" | "offline" | "typing";
  lastSeen?: string;
}

export interface Message {
  id: string;
  contactId: string;
  text: string;
  timestamp: string;
  sent: boolean; // true = I sent it
  read: boolean;
  type: "text" | "image" | "voice";
  imagePlaceholder?: string;
  voiceDuration?: string;
}

export interface Chat {
  contact: Contact;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  pinned?: boolean;
}

const AVATAR_COLORS = [
  "#00a884", "#53bdeb", "#ff6b6b", "#ffa726",
  "#7c4dff", "#e91e63", "#26a69a", "#8d6e63",
];

export const contacts: Contact[] = [
  { id: "1", name: "Alice Chen", initials: "AC", avatarColor: AVATAR_COLORS[0], status: "online" },
  { id: "2", name: "Bob Martinez", initials: "BM", avatarColor: AVATAR_COLORS[1], status: "offline", lastSeen: "today at 2:15 PM" },
  { id: "3", name: "Carol Williams", initials: "CW", avatarColor: AVATAR_COLORS[2], status: "online" },
  { id: "4", name: "David Kim", initials: "DK", avatarColor: AVATAR_COLORS[3], status: "offline", lastSeen: "yesterday at 9:42 PM" },
  { id: "5", name: "Elena Rossi", initials: "ER", avatarColor: AVATAR_COLORS[4], status: "typing" },
  { id: "6", name: "Frank Okonkwo", initials: "FO", avatarColor: AVATAR_COLORS[5], status: "offline", lastSeen: "today at 11:00 AM" },
  { id: "7", name: "Grace Liu", initials: "GL", avatarColor: AVATAR_COLORS[6], status: "online" },
  { id: "8", name: "Hassan Ali", initials: "HA", avatarColor: AVATAR_COLORS[7], status: "offline", lastSeen: "Monday" },
  { id: "9", name: "UOR Foundation", initials: "UF", avatarColor: AVATAR_COLORS[0], status: "online" },
];

export const messages: Record<string, Message[]> = {
  "1": [
    { id: "m1", contactId: "1", text: "Hey! Have you seen the new UOR spec?", timestamp: "9:15 AM", sent: false, read: true, type: "text" },
    { id: "m2", contactId: "1", text: "Yes! The coherence proofs are elegant 🔥", timestamp: "9:16 AM", sent: true, read: true, type: "text" },
    { id: "m3", contactId: "1", text: "Right? The prime factorization approach is genius", timestamp: "9:17 AM", sent: false, read: true, type: "text" },
    { id: "m4", contactId: "1", text: "I was just reading about the observer framework", timestamp: "9:18 AM", sent: true, read: true, type: "text" },
    { id: "m5", contactId: "1", text: "The way it models epistemic states is really clean", timestamp: "9:18 AM", sent: true, read: true, type: "text" },
    { id: "m6", contactId: "1", text: "Totally. Are you going to the community call tomorrow?", timestamp: "9:20 AM", sent: false, read: true, type: "text" },
    { id: "m7", contactId: "1", text: "Wouldn't miss it! 🙌", timestamp: "9:21 AM", sent: true, read: true, type: "text" },
    { id: "m8", contactId: "1", text: "", timestamp: "9:22 AM", sent: false, read: true, type: "image", imagePlaceholder: "Architecture diagram" },
    { id: "m9", contactId: "1", text: "Check out this architecture diagram I made", timestamp: "9:22 AM", sent: false, read: true, type: "text" },
    { id: "m10", contactId: "1", text: "That's beautiful! Really clear visualization", timestamp: "9:24 AM", sent: true, read: true, type: "text" },
    { id: "m11", contactId: "1", text: "", timestamp: "9:25 AM", sent: true, read: true, type: "voice", voiceDuration: "0:42" },
    { id: "m12", contactId: "1", text: "Ha nice voice note! Let me think about that...", timestamp: "9:26 AM", sent: false, read: true, type: "text" },
    { id: "m13", contactId: "1", text: "The key insight is that every object has a unique canonical representation", timestamp: "9:28 AM", sent: true, read: true, type: "text" },
    { id: "m14", contactId: "1", text: "Yes exactly! And the coherence norms guarantee consistency across frames", timestamp: "9:29 AM", sent: false, read: true, type: "text" },
    { id: "m15", contactId: "1", text: "Can't wait to build on top of this 🚀", timestamp: "9:30 AM", sent: true, read: true, type: "text" },
  ],
  "2": [
    { id: "m20", contactId: "2", text: "Did you finish the pull request?", timestamp: "2:10 PM", sent: false, read: true, type: "text" },
    { id: "m21", contactId: "2", text: "Almost done, just running tests", timestamp: "2:12 PM", sent: true, read: true, type: "text" },
    { id: "m22", contactId: "2", text: "Great, let me know when it's ready for review", timestamp: "2:15 PM", sent: false, read: true, type: "text" },
  ],
  "3": [
    { id: "m30", contactId: "3", text: "The meeting is at 3pm right?", timestamp: "11:00 AM", sent: false, read: true, type: "text" },
    { id: "m31", contactId: "3", text: "Yes! Conference room B", timestamp: "11:02 AM", sent: true, read: true, type: "text" },
  ],
  "5": [
    { id: "m50", contactId: "5", text: "Have you tried the new lens system?", timestamp: "10:30 AM", sent: false, read: false, type: "text" },
    { id: "m51", contactId: "5", text: "It automatically suggests perspectives based on your reading patterns", timestamp: "10:30 AM", sent: false, read: false, type: "text" },
    { id: "m52", contactId: "5", text: "That sounds amazing! 😍", timestamp: "10:32 AM", sent: true, read: true, type: "text" },
  ],
  "9": [
    { id: "m90", contactId: "9", text: "Welcome to the UOR Foundation community! 🌐", timestamp: "Yesterday", sent: false, read: true, type: "text" },
    { id: "m91", contactId: "9", text: "Thank you! Excited to be here", timestamp: "Yesterday", sent: true, read: true, type: "text" },
  ],
};

export const chats: Chat[] = [
  { contact: contacts[0], lastMessage: "Can't wait to build on top of this 🚀", lastMessageTime: "9:30 AM", unread: 0, pinned: true },
  { contact: contacts[4], lastMessage: "That sounds amazing! 😍", lastMessageTime: "10:32 AM", unread: 2 },
  { contact: contacts[1], lastMessage: "Great, let me know when it's ready for review", lastMessageTime: "2:15 PM", unread: 0 },
  { contact: contacts[2], lastMessage: "Yes! Conference room B", lastMessageTime: "11:02 AM", unread: 0 },
  { contact: contacts[3], lastMessage: "See you next week!", lastMessageTime: "Yesterday", unread: 0 },
  { contact: contacts[5], lastMessage: "Thanks for the update 👍", lastMessageTime: "Yesterday", unread: 0 },
  { contact: contacts[6], lastMessage: "Let me check and get back to you", lastMessageTime: "Monday", unread: 0 },
  { contact: contacts[7], lastMessage: "Sounds good!", lastMessageTime: "Monday", unread: 0 },
  { contact: contacts[8], lastMessage: "Welcome to the UOR Foundation community! 🌐", lastMessageTime: "Yesterday", unread: 0 },
];
