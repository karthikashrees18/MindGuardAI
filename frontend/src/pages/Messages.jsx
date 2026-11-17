// Student in-app messages: chat with any counselor or student account.
import React from "react";
import { messagesApi } from "../api";
import { PageHeader } from "../components/ui";
import Messenger from "../components/Messenger";

export default function Messages() {
  return (
    <>
      <PageHeader title="Messages" subtitle="Chat directly with counselors and other students. You can block or report anyone." />
      <Messenger client={messagesApi} />
    </>
  );
}
