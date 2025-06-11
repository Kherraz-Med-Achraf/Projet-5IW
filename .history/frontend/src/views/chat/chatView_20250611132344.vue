
  
  <style scoped>
  .chat-container {
    display: flex; height: 100vh;
  }
  
  .sidebar {
    width: 260px;
    background: #f3f2f1; /* gris clair */
    border-right: 1px solid #ddd;
    overflow-y: auto;
  }
  .section {
    padding: 16px;
  }
  .section h3 {
    margin-bottom: 8px;
    font-size: 0.9rem; color: #666;
  }
  .section ul {
    list-style: none; padding: 0; margin: 0;
  }
  .section li {
    display: flex; align-items: center;
    padding: 8px; border-radius: 4px;
    cursor: pointer; margin-bottom: 4px;
  }
  .section li.active,
  .section li:hover {
    background: #e1dfdd;
  }
  .avatar {
    width: 32px; height: 32px; border-radius: 50%;
    margin-right: 8px;
  }
  .preview {
    font-size: 0.75rem; color: #888; margin-left: auto;
  }
  
  .content {
    flex: 1; display: flex; flex-direction: column;
  }
  .chat-header {
    display: flex; align-items: center;
    padding: 16px; border-bottom: 1px solid #ddd;
  }
  .avatar-lg {
    width: 40px; height: 40px; border-radius: 50%;
    margin-right: 12px;
  }
  .messages {
    flex: 1; padding: 16px;
    overflow-y: auto; background: #fff;
  }
  .message {
    display: flex; margin-bottom: 12px;
  }
  .message.mine {
    justify-content: flex-end;
  }
  .message.theirs {
    justify-content: flex-start;
  }
  .avatar-sm {
    width: 24px; height: 24px; border-radius: 50%;
    margin-right: 8px;
  }
  .bubble {
    max-width: 60%;
    padding: 10px 14px;
    border-radius: 8px;
    background: var(--bubble-bg);
    position: relative;
  }
  .message.mine .bubble {
    background: #605e5c; /* violet Teams */
    color: #fff;
  }
  .message.theirs .bubble {
    background: #f3f2f1;
    color: #000;
  }
  .bubble time {
    display: block;
    font-size: 0.6rem;
    color: rgba(0,0,0,0.45);
    margin-top: 4px;
    text-align: right;
  }
  
  .composer {
    display: flex; padding: 12px; border-top: 1px solid #ddd;
  }
  .composer input {
    flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;
  }
  .composer button {
    margin-left: 8px; padding: 8px 16px; border: none; border-radius: 4px;
    background: #6264a7; color: #fff;
  }
  .avatar, .avatar-sm, .avatar-lg {
  display:inline-flex; align-items:center; justify-content:center;
  color:#fff; font-weight:600; border-radius:50%;
}
.avatar     { width:32px; height:32px; font-size:.9rem; margin-right:8px; }
.avatar-sm  { width:24px; height:24px; font-size:.7rem; margin-right:8px; }
.avatar-lg  { width:40px; height:40px; font-size:1rem; margin-right:12px; }
  </style>
  