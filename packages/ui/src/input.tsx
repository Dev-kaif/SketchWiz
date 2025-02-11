function Input({
  place,
  onChangeHandle,
  type,
  size,
  inputRef
}: {
  place: string;
  type?: string;
  size?:string;
  onChangeHandle?: (e: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div>
      <input
      ref={inputRef}
        onChange={(e) => {
          if (!onChangeHandle) return;
          onChangeHandle(e.target.value);
        }}
        className={`${size} bg-[#0D2538]/80 text-white placeholder-gray-400 border border-gray-600 rounded-md px-4 py-3 focus:outline-none focus:border-[#1A73E8] transition-colors duration-300`}
        placeholder={place}
        type={`${type? type:'text'}`}
      />
    </div>
  );
}

export default Input;
