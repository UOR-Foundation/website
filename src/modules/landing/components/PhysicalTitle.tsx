interface PhysicalTitleProps {
  lineOneClass: string;
  lineTwoClass: string;
  wrapperClass: string;
  delay?: string;
  word?: string;
  lineOne?: string;
}

/**
 * PhysicalTitle — static hero headline with subtle depth cues
 * (contact shadow + top-edge highlight via CSS). No motion.
 */
const PhysicalTitle = ({
  lineOneClass,
  lineTwoClass,
  wrapperClass,
  delay = "0s",
  word = "UNIVERSAL",
  lineOne = "Make Data Identity",
}: PhysicalTitleProps) => {
  return (
    <h1
      className={`${wrapperClass} hero-physical-title`}
      style={{ animationDelay: delay }}
    >
      <span className="hero-physical-inner block">
        <span className={lineOneClass}>{lineOne}</span>
        <span className={lineTwoClass} aria-label={word}>
          {word.split("").map((char, i) => (
            <span key={i} aria-hidden="true">
              {char}
            </span>
          ))}
        </span>
      </span>
    </h1>
  );
};

export default PhysicalTitle;