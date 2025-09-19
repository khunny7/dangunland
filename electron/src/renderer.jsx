import React from 'react';
import ReactDOM from 'react-dom/client';
import { App, ElectronIPCAdapter } from 'dangunland-shared-ui';
import 'dangunland-shared-ui/dist/index.css';

// Create communication adapter for Electron
const communicationAdapter = new ElectronIPCAdapter();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App communicationAdapter={communicationAdapter} />
  </React.StrictMode>
);