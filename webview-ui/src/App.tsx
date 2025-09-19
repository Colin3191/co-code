import { ChatInterface } from '@/components/ChatInterface';
import { ThemeProvider } from './components/theme-provider';

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark">
      <ChatInterface />
    </ThemeProvider>
  );
};

export { App };
