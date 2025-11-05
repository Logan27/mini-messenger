export const TypingIndicator = () => {
  return (
    <div className="flex items-start gap-2 mb-2">
      <div className="bg-muted/50 rounded-2xl rounded-bl-md px-3 py-2">
        <div className="flex gap-1 items-center">
          <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
          <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
          <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
        </div>
      </div>
    </div>
  );
};
