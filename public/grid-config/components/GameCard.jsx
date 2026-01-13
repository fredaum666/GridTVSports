import ResizableElement from './ResizableElement';

const GameCard = ({
  game,
  index,
  gridCount,
  config,
  selectedElement,
  isCardSelected,
  onSelectElement,
  isSelected
}) => {
  // Get config value or default
  const getConfigStyle = (element, property, defaultValue) => {
    const elementConfig = config?.[element]?.[property];
    if (!elementConfig) return defaultValue;
    return `clamp(${elementConfig.min}${elementConfig.unit}, ${elementConfig.preferred}vmin, ${elementConfig.max}${elementConfig.unit})`;
  };

  // Determine if home team is winning
  const homeWinning = game.home.score > game.away.score;
  const awayWinning = game.away.score > game.home.score;

  return (
    <div className={`preview-card ${isCardSelected ? 'card-selected' : ''}`}>
      <div className="card-content">
        {/* Teams Row */}
        <div className="teams-row">
          {/* Away Team */}
          <div className="team-stack">
            <ResizableElement
              elementType="teamLogo"
              isSelected={isSelected('teamLogo', index)}
              onSelect={() => onSelectElement('teamLogo')}
            >
              <div className="team-logo-container">
                <img
                  className="team-logo"
                  src={game.away.logo}
                  alt={game.away.name}
                  style={{
                    width: getConfigStyle('teamLogo', 'width', '40px'),
                    height: getConfigStyle('teamLogo', 'height', '40px')
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                {game.possession === 'away' && (
                  <span className="possession-indicator">🏈</span>
                )}
              </div>
            </ResizableElement>
            <ResizableElement
              elementType="teamName"
              isSelected={isSelected('teamName', index)}
              onSelect={() => onSelectElement('teamName')}
            >
              <span
                className="team-name"
                style={{ fontSize: getConfigStyle('teamName', 'fontSize', '0.625rem') }}
              >
                {game.away.abbr}
              </span>
            </ResizableElement>
            <span className="team-record">{game.away.record}</span>
          </div>

          {/* Away Score */}
          <ResizableElement
            elementType="scoreText"
            isSelected={isSelected('scoreText', index)}
            onSelect={() => onSelectElement('scoreText')}
          >
            <span
              className={`score ${awayWinning ? 'winning' : ''}`}
              style={{ fontSize: getConfigStyle('scoreText', 'fontSize', '1.5rem') }}
            >
              {game.away.score}
            </span>
          </ResizableElement>

          {/* VS Divider */}
          <span className="vs-divider">VS</span>

          {/* Home Score */}
          <ResizableElement
            elementType="scoreText"
            isSelected={isSelected('scoreText', index)}
            onSelect={() => onSelectElement('scoreText')}
          >
            <span
              className={`score ${homeWinning ? 'winning' : ''}`}
              style={{ fontSize: getConfigStyle('scoreText', 'fontSize', '1.5rem') }}
            >
              {game.home.score}
            </span>
          </ResizableElement>

          {/* Home Team */}
          <div className="team-stack">
            <ResizableElement
              elementType="teamLogo"
              isSelected={isSelected('teamLogo', index)}
              onSelect={() => onSelectElement('teamLogo')}
            >
              <div className="team-logo-container">
                <img
                  className="team-logo"
                  src={game.home.logo}
                  alt={game.home.name}
                  style={{
                    width: getConfigStyle('teamLogo', 'width', '40px'),
                    height: getConfigStyle('teamLogo', 'height', '40px')
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                {game.possession === 'home' && (
                  <span className="possession-indicator">🏈</span>
                )}
              </div>
            </ResizableElement>
            <ResizableElement
              elementType="teamName"
              isSelected={isSelected('teamName', index)}
              onSelect={() => onSelectElement('teamName')}
            >
              <span
                className="team-name"
                style={{ fontSize: getConfigStyle('teamName', 'fontSize', '0.625rem') }}
              >
                {game.home.abbr}
              </span>
            </ResizableElement>
            <span className="team-record">{game.home.record}</span>
          </div>
        </div>

        {/* Game Status */}
        <ResizableElement
          elementType="gameStatus"
          isSelected={isSelected('gameStatus', index)}
          onSelect={() => onSelectElement('gameStatus')}
        >
          <span
            className="game-status"
            style={{ fontSize: getConfigStyle('gameStatus', 'fontSize', '0.75rem') }}
          >
            {game.status}
          </span>
        </ResizableElement>

        {/* Down & Distance */}
        {game.downDistance && (
          <span className="down-distance">{game.downDistance}</span>
        )}

        {/* Timeouts */}
        <ResizableElement
          elementType="timeoutIndicator"
          isSelected={isSelected('timeoutIndicator', index)}
          onSelect={() => onSelectElement('timeoutIndicator')}
        >
          <div className="timeouts-container">
            <div className="timeout-group">
              {[...Array(3)].map((_, i) => (
                <div
                  key={`away-${i}`}
                  className={`timeout-dot ${i < game.away.timeouts ? 'active' : ''}`}
                  style={{
                    width: getConfigStyle('timeoutIndicator', 'width', '8px'),
                    height: getConfigStyle('timeoutIndicator', 'height', '4px')
                  }}
                />
              ))}
            </div>
            <div className="timeout-group">
              {[...Array(3)].map((_, i) => (
                <div
                  key={`home-${i}`}
                  className={`timeout-dot ${i < game.home.timeouts ? 'active' : ''}`}
                  style={{
                    width: getConfigStyle('timeoutIndicator', 'width', '8px'),
                    height: getConfigStyle('timeoutIndicator', 'height', '4px')
                  }}
                />
              ))}
            </div>
          </div>
        </ResizableElement>

        {/* Field Visualizer */}
        <ResizableElement
          elementType="fieldVisualizer"
          isSelected={isSelected('fieldVisualizer', index)}
          onSelect={() => onSelectElement('fieldVisualizer')}
        >
          <div
            className="field-visualizer"
            style={{
              width: getConfigStyle('fieldVisualizer', 'width', '90%'),
              height: getConfigStyle('fieldVisualizer', 'height', '30px')
            }}
          />
        </ResizableElement>
      </div>
    </div>
  );
};

export default GameCard;
