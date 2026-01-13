import ResizableElement from './ResizableElement';
import { getScoreboardConfig, getGridConfig } from '../utils/cssVariables';

const ScoreboardCard = ({
  game,
  index,
  gridCount,
  device,
  selectedElement,
  isCardSelected,
  onSelectElement,
  isSelected
}) => {
  const sbConfig = getScoreboardConfig(gridCount);
  const gridConfig = getGridConfig(device, gridCount);

  // Determine if home team is winning
  const homeWinning = game.home.score > game.away.score;
  const awayWinning = game.away.score > game.home.score;

  // CSS custom properties for team colors
  const cardStyle = {
    '--sb-away-primary': game.away.primaryColor || '#4b5563',
    '--sb-away-secondary': game.away.secondaryColor || '#374151',
    '--sb-home-primary': game.home.primaryColor || '#6b7280',
    '--sb-home-secondary': game.home.secondaryColor || '#4b5563',
  };

  return (
    <div
      className={`fullscreen-game-card has-scoreboard fs-${game.league} ${isCardSelected ? 'card-selected' : ''}`}
      style={cardStyle}
    >
      {/* Sport Logo - Top Right */}
      <img
        className="sport-logo-indicator"
        src={`/assets/${game.sport}.png`}
        alt={game.sport}
        style={{
          width: gridConfig.sportLogo?.width || '60px',
          height: gridConfig.sportLogo?.height || '60px'
        }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />

      {/* Card Wrapper */}
      <div className="fs-card-wrapper">
        {/* Scoreboard Top - Team Logos */}
        <div className="fs-scoreboard-top">
          <div className="fs-sb-logo-spacer" />

          {/* Away Logo Box */}
          <div className="fs-sb-logo-box">
            <ResizableElement
              elementType="teamLogo"
              isSelected={isSelected('teamLogo', index)}
              onSelect={() => onSelectElement('teamLogo')}
            >
              <div className="fs-card-team-logo-wrapper">
                <img
                  className="fs-card-team-logo"
                  src={game.away.logo}
                  alt={game.away.name}
                  style={{
                    width: sbConfig.teamLogo?.width,
                    height: sbConfig.teamLogo?.height
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                {game.possession === 'away' && (
                  <span className="fs-possession-indicator away" style={{ fontSize: sbConfig.possession?.fontSize }}>
                    🏈
                  </span>
                )}
              </div>
            </ResizableElement>
          </div>

          <div className="fs-sb-logo-center-spacer" />

          {/* Home Logo Box */}
          <div className="fs-sb-logo-box">
            <ResizableElement
              elementType="teamLogo"
              isSelected={isSelected('teamLogo', index)}
              onSelect={() => onSelectElement('teamLogo')}
            >
              <div className="fs-card-team-logo-wrapper">
                <img
                  className="fs-card-team-logo"
                  src={game.home.logo}
                  alt={game.home.name}
                  style={{
                    width: sbConfig.teamLogo?.width,
                    height: sbConfig.teamLogo?.height
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                {game.possession === 'home' && (
                  <span className="fs-possession-indicator home" style={{ fontSize: sbConfig.possession?.fontSize }}>
                    🏈
                  </span>
                )}
              </div>
            </ResizableElement>
          </div>

          <div className="fs-sb-logo-spacer" />
        </div>

        {/* Main Scoreboard */}
        <ResizableElement
          elementType="scoreboard"
          isSelected={isSelected('scoreboard', index)}
          onSelect={() => onSelectElement('scoreboard')}
        >
          <div className="fs-scoreboard" style={{ height: sbConfig.scoreboard?.height }}>
            {/* Away Score Box */}
            <div className="fs-sb-score-box away" style={{ width: sbConfig.scoreBox?.width }}>
              <ResizableElement
                elementType="scoreText"
                isSelected={isSelected('scoreText', index)}
                onSelect={() => onSelectElement('scoreText')}
              >
                <span
                  className={`fs-sb-score ${awayWinning ? 'winning' : ''}`}
                  style={{ fontSize: sbConfig.score?.fontSize }}
                >
                  {game.away.score}
                </span>
              </ResizableElement>
            </div>

            {/* Away Team Section */}
            <div className="fs-sb-team-section away">
              <ResizableElement
                elementType="teamName"
                isSelected={isSelected('teamName', index)}
                onSelect={() => onSelectElement('teamName')}
              >
                <div className="fs-sb-team-info">
                  <span className="fs-sb-team-name" style={{ fontSize: sbConfig.teamName?.fontSize }}>
                    {game.away.abbr}
                  </span>
                  <span className="fs-sb-team-record" style={{ fontSize: sbConfig.teamRecord?.fontSize }}>
                    {game.away.record}
                  </span>
                </div>
              </ResizableElement>

              {/* Away Timeouts */}
              <ResizableElement
                elementType="timeoutIndicator"
                isSelected={isSelected('timeoutIndicator', index)}
                onSelect={() => onSelectElement('timeoutIndicator')}
              >
                <div className="fs-sb-timeouts">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={`away-${i}`}
                      className={`fs-sb-timeout-bar ${i >= game.away.timeouts ? 'used' : ''}`}
                      style={{
                        width: sbConfig.timeoutBar?.width,
                        height: sbConfig.timeoutBar?.height
                      }}
                    />
                  ))}
                </div>
              </ResizableElement>
            </div>

            {/* Center Time/Status */}
            <div className="fs-sb-center">
              <ResizableElement
                elementType="gameStatus"
                isSelected={isSelected('gameStatus', index)}
                onSelect={() => onSelectElement('gameStatus')}
              >
                <div className="fs-sb-time-box">
                  <div className="fs-sb-time-label">{game.quarter}</div>
                  <div className="fs-sb-time" style={{ fontSize: sbConfig.time?.fontSize }}>
                    {game.clock}
                  </div>
                </div>
              </ResizableElement>
            </div>

            {/* Home Team Section */}
            <div className="fs-sb-team-section home">
              {/* Home Timeouts */}
              <ResizableElement
                elementType="timeoutIndicator"
                isSelected={isSelected('timeoutIndicator', index)}
                onSelect={() => onSelectElement('timeoutIndicator')}
              >
                <div className="fs-sb-timeouts">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={`home-${i}`}
                      className={`fs-sb-timeout-bar ${i >= game.home.timeouts ? 'used' : ''}`}
                      style={{
                        width: sbConfig.timeoutBar?.width,
                        height: sbConfig.timeoutBar?.height
                      }}
                    />
                  ))}
                </div>
              </ResizableElement>

              <ResizableElement
                elementType="teamName"
                isSelected={isSelected('teamName', index)}
                onSelect={() => onSelectElement('teamName')}
              >
                <div className="fs-sb-team-info">
                  <span className="fs-sb-team-name" style={{ fontSize: sbConfig.teamName?.fontSize }}>
                    {game.home.abbr}
                  </span>
                  <span className="fs-sb-team-record" style={{ fontSize: sbConfig.teamRecord?.fontSize }}>
                    {game.home.record}
                  </span>
                </div>
              </ResizableElement>
            </div>

            {/* Home Score Box */}
            <div className="fs-sb-score-box home" style={{ width: sbConfig.scoreBox?.width }}>
              <ResizableElement
                elementType="scoreText"
                isSelected={isSelected('scoreText', index)}
                onSelect={() => onSelectElement('scoreText')}
              >
                <span
                  className={`fs-sb-score ${homeWinning ? 'winning' : ''}`}
                  style={{ fontSize: sbConfig.score?.fontSize }}
                >
                  {game.home.score}
                </span>
              </ResizableElement>
            </div>

            {/* Situation Box (Down & Distance) */}
            {game.downDistance && (
              <div className={`fs-sb-situation ${game.possession === 'home' ? 'possession-home' : 'possession-away'} ${game.isRedzone ? 'redzone' : ''}`}>
                <ResizableElement
                  elementType="downDistance"
                  isSelected={isSelected('downDistance', index)}
                  onSelect={() => onSelectElement('downDistance')}
                >
                  <span className="fs-sb-down-distance" style={{ fontSize: sbConfig.situation?.fontSize }}>
                    {game.downDistance}
                  </span>
                </ResizableElement>
                <div className="fs-sb-situation-divider" />
                <span className="fs-sb-ball-position">{game.fieldPosition}</span>
              </div>
            )}
          </div>
        </ResizableElement>

        {/* Field Visualizer */}
        <ResizableElement
          elementType="fieldVisualizer"
          isSelected={isSelected('fieldVisualizer', index)}
          onSelect={() => onSelectElement('fieldVisualizer')}
        >
          <div className="field-visualizer">
            <div className="field-wrapper">
              <div className="football-field-container">
                {/* Away Endzone */}
                <div
                  className="end-zone left away-endzone"
                  style={{ background: game.away.primaryColor }}
                />

                {/* Playing Field */}
                <div className="playing-field">
                  {/* 10 Yard Sections */}
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="ten-yard-section" />
                  ))}

                  {/* Hash marks */}
                  <div className="hash-marks-container">
                    <div className="hash-row middle-single" />
                  </div>

                  {/* Numbers overlay */}
                  <div className="numbers-overlay">
                    <div className="numbers-row bottom">
                      {['10', '20', '30', '40', '50', '40', '30', '20', '10'].map((num, i) => (
                        <div key={i} className="number-group">{num}</div>
                      ))}
                    </div>
                  </div>

                  {/* Ball indicator */}
                  <div className="ball-indicator" style={{ left: '35%' }} />

                  {/* First down line */}
                  <div className="first-down-line" style={{ left: '45%' }} />
                </div>

                {/* Home Endzone */}
                <div
                  className="end-zone right home-endzone"
                  style={{ background: game.home.primaryColor }}
                />
              </div>
            </div>
          </div>
        </ResizableElement>
      </div>
    </div>
  );
};

export default ScoreboardCard;
