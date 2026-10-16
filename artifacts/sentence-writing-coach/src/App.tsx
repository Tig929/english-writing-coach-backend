import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  getHealthCheckQueryKey,
  getSendCoachMessageMutationKey,
  getSendCoachMessageUrl,
  sendCoachMessage,
  useHealthCheck,
  useSendCoachMessage,
} from '@workspace/api-client-react';
import {
  ArrowUp,
  BookOpen,
  Check,
  CircleHelp,
  Heart,
  RotateCcw,
  X,
} from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Topic = 'Family' | 'Daily Routine' | 'Food';
type Turn = { role: 'user' | 'assistant'; content: string };
type CoachInput = {
  topic: Topic;
  learnerMessage: string;
  sentenceDraft: string;
  selectedWords: string[];
  history: Turn[];
};

const topicPrompts: Record<Topic, { prompt: string; nudge: string; words: string[] }> = {
  Family: {
    prompt: 'Tell me about someone in your family.',
    nudge: 'Who comes to mind? What do you like doing together?',
    words: ['my mother', 'my brother', 'my family', 'kind', 'funny', 'helpful', 'we cook', 'we talk', 'on weekends', 'at home', 'I feel', 'together'],
  },
  'Daily Routine': {
    prompt: 'Walk me through a small part of your day.',
    nudge: 'What happens first? What is one thing you enjoy?',
    words: ['in the morning', 'I wake up', 'I usually', 'make breakfast', 'go to work', 'study English', 'after lunch', 'in the evening', 'sometimes', 'then', 'because', 'relax'],
  },
  Food: {
    prompt: 'Describe a food you enjoy.',
    nudge: 'What does it taste like? When do you like to eat it?',
    words: ['I love', 'my favorite', 'rice and beans', 'fresh fruit', 'it tastes', 'delicious', 'a little spicy', 'at home', 'with my family', 'for lunch', 'because', 'I make it'],
  },
};

const topics: Topic[] = ['Family', 'Daily Routine', 'Food'];

function Home() {
  const [topic, setTopic] = useState<Topic>('Family');
  const [draft, setDraft] = useState('');
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [learnerMessage, setLearnerMessage] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [failedInput, setFailedInput] = useState<CoachInput | null>(null);
  const [errorText, setErrorText] = useState('');

  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 45000 } });
  const coach = useSendCoachMessage({
    mutation: {
      mutationKey: getSendCoachMessageMutationKey(),
      mutationFn: ({ data }) => sendCoachMessage(data),
    },
  });

  const switchTopic = (nextTopic: Topic) => {
    setTopic(nextTopic);
    setDraft('');
    setSelectedWords([]);
    setLearnerMessage('');
    setTurns([]);
    setErrorText('');
    setFailedInput(null);
    coach.reset();
  };

  const toggleWord = (word: string) => {
    if (selectedWords.includes(word)) {
      setSelectedWords((words) => words.filter((item) => item !== word));
      return;
    }
    if (selectedWords.length >= 24) return;
    setSelectedWords((words) => [...words, word]);
    setDraft((current) => current.trim() ? `${current.trimEnd()} ${word}` : word);
  };

  const clearDraft = () => {
    setDraft('');
    setSelectedWords([]);
  };

  const submitInput = (input: CoachInput, visibleMessage: string) => {
    setErrorText('');
    setFailedInput(input);
    coach.mutate({ data: input }, {
      onSuccess: (response) => {
        setTurns((current) => [...current, { role: 'assistant', content: response.message }]);
        setErrorText('');
        setFailedInput(null);
        setLearnerMessage('');
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'The coach could not reply just now.';
        setErrorText(message);
        setFailedInput(input);
      },
    });
    if (visibleMessage) setTurns((current) => [...current, { role: 'user', content: visibleMessage }]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = learnerMessage.trim();
    if (!message || coach.isPending) return;
    const history = turns.slice(-12).map(({ role, content }) => ({ role, content }));
    const input: CoachInput = {
      topic,
      learnerMessage: message,
      sentenceDraft: draft.slice(0, 500),
      selectedWords: selectedWords.slice(0, 24),
      history,
    };
    submitInput(input, message);
  };

  const handleComposeKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const status = health.isLoading ? 'Checking connection' : health.isError ? 'Coach offline' : `API ${health.data?.status ?? 'connected'}`;
  const healthState = health.isLoading ? 'checking' : health.isError ? 'offline' : 'online';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand" data-testid="text-brand">
          <span className="brand-mark"><BookOpen size={17} strokeWidth={1.8} /></span>
          <span>Little by little English</span>
        </div>
        <div className="health" data-testid="status-api-connectivity" aria-live="polite">
          <span className={`health-dot ${healthState}`} />
          <span>{status}</span>
        </div>
      </header>

      <section className="page-intro" aria-labelledby="page-title">
        <div>
          <div className="eyebrow">A little practice, every day</div>
          <h1 id="page-title">Find your words.</h1>
          <p>Start with an idea. Shape it into a sentence that sounds like you.</p>
        </div>
        <div className="intro-note"><Heart size={17} strokeWidth={1.6} /> You are the author. I’m here to help you find your way.</div>
      </section>

      <div className="workspace">
        <section className="practice-pane" aria-label="Sentence writing practice">
          <div className="section-kicker">
            <div className="step-label"><span className="step-number">01</span> Choose a topic</div>
          </div>
          <div className="topic-list" role="group" aria-label="Practice topics">
            {topics.map((item) => (
              <button
                type="button"
                className={`topic-button ${item === topic ? 'selected' : ''}`}
                aria-pressed={item === topic}
                key={item}
                onClick={() => switchTopic(item)}
                data-testid={`button-topic-${item.toLowerCase().replaceAll(' ', '-')}`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="prompt-card" data-testid="text-practice-prompt">
            <div className="prompt-overline">A thought to get you started</div>
            <h2 className="prompt-title">{topicPrompts[topic].prompt}</h2>
            <p className="prompt-help">{topicPrompts[topic].nudge}</p>
          </div>

          <div className="section-kicker">
            <div className="step-label"><span className="step-number">02</span> Build your sentence</div>
          </div>
          <div className="bank-header">
            <h2>Words to borrow</h2>
            <span>Tap any word to add it</span>
          </div>
          <div className="word-bank" aria-label={`${topic} word bank`}>
            {topicPrompts[topic].words.map((word, index) => {
              const included = selectedWords.includes(word);
              return (
                <button
                  type="button"
                  className={`word-chip ${included ? 'included' : ''}`}
                  aria-pressed={included}
                  key={word}
                  onClick={() => toggleWord(word)}
                  data-testid={`button-word-${index}`}
                >
                  {included && <Check size={12} aria-hidden="true" />} {word}
                </button>
              );
            })}
          </div>

          <div className="draft-heading">
            <h2>Your sentence</h2>
            <button type="button" className="clear-button" onClick={clearDraft} data-testid="button-clear-draft">
              <RotateCcw size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} /> Start again
            </button>
          </div>
          <div className="draft-box">
            <textarea
              value={draft}
              maxLength={500}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write your idea here. It does not need to be perfect."
              aria-label="Your sentence draft"
              data-testid="input-sentence-draft"
            />
            <div className="draft-foot"><span>A first try is a good try.</span><span>{draft.length} / 500</span></div>
          </div>
          {!!selectedWords.length && (
            <div className="selected-words" aria-label="Selected words" data-testid="list-selected-words">
              <span className="selected-label">Your word choices</span>
              {selectedWords.map((word) => (
                <span className="selected-word" key={word}>
                  {word}
                  <button type="button" aria-label={`Remove ${word}`} onClick={() => toggleWord(word)} data-testid={`button-remove-word-${word.replaceAll(' ', '-')}`}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="coach-pane" aria-label="Conversation with your writing coach" data-api-endpoint={getSendCoachMessageUrl()}>
          <div className="chat-header">
            <div className="coach-identity">
              <span className="coach-avatar"><BookOpen size={18} strokeWidth={1.7} /></span>
              <div><div className="coach-name">Your writing coach</div><div className="coach-subtitle">Here to listen, not to take over</div></div>
            </div>
            <span className="chat-context">{topic}</span>
          </div>
          <div className="chat-scroll" aria-live="polite" aria-relevant="additions text" data-testid="list-chat-turns">
            <div className="welcome-note">
              <span className="welcome-icon"><CircleHelp size={14} /></span>
              <div className="welcome-text">Share your sentence or ask me a question. We can work through your idea together, one small step at a time.</div>
            </div>
            {turns.map((turn, index) => (
              <div className={`chat-turn ${turn.role}`} key={`${turn.role}-${index}`} data-testid={`text-chat-${turn.role}-${index}`}>
                <span className="chat-turn-label">{turn.role === 'user' ? 'You' : 'Your coach'}</span>
                {turn.content}
              </div>
            ))}
            {coach.isPending && (
              <div className="chat-turn assistant" role="status" data-testid="status-coach-thinking">
                <span className="chat-turn-label">Your coach</span>
                <span className="loading-dots" aria-label="Thinking"><i /><i /><i /></span>
              </div>
            )}
          </div>
          {errorText && (
            <div className="error-notice" role="alert" data-testid="status-coach-error">
              <strong>Your message is still here.</strong>
              {errorText.replace(/^HTTP \d+(?: [^:]+)?:\s*/i, '')}
              {failedInput && (
                <button type="button" className="retry-button" onClick={() => submitInput(failedInput, '')} data-testid="button-retry-coach">
                  Try again
                </button>
              )}
            </div>
          )}
          <form className="chat-compose" onSubmit={handleSubmit}>
            <div className="compose-label">What would you like help with?</div>
            <div className="compose-box">
              <textarea
                value={learnerMessage}
                maxLength={500}
                onChange={(event) => setLearnerMessage(event.target.value)}
                onKeyDown={handleComposeKey}
                placeholder="Tell me what you’re thinking…"
                aria-label="Message your writing coach"
                data-testid="input-coach-message"
                rows={2}
              />
              <button className="send-button" type="submit" aria-label="Send message" disabled={!learnerMessage.trim() || coach.isPending} data-testid="button-send-message">
                <ArrowUp size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="compose-hint">
              <span>Enter to send · Shift + Enter for a new line</span><span>{learnerMessage.length} / 500</span>
            </div>
          </form>
        </section>
      </div>
      <footer className="footer-note">
        <span>There is no single right way to say what you mean.</span>
        <span>Take your time.</span>
      </footer>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
