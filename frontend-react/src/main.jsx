import React from 'react';
import ReactDOM from 'react-dom/client';
import { App, WebSocketCommunicationAdapter } from 'dangunland-shared-ui';
import 'dangunland-shared-ui/dist/index.css';

// Create communication adapter for web
const communicationAdapter = new WebSocketCommunicationAdapter();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App communicationAdapter={communicationAdapter} />
  </React.StrictMode>
);
