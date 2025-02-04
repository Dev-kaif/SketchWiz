function Input({
  place,
  onChangeHandle,
  type,
}: {
  place: string;
  type?: string;
  onChangeHandle?: (e: string) => void;
}) {
  return (
    <div>
      <input
        onChange={(e) => {
          if (!onChangeHandle) return;
          onChangeHandle(e.target.value);
        }}
        className="bg-[#3C364C]  w-full px-5 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7a61c4] focus:border-transparent "
        placeholder={place}
        type={`${type? type:'text'}`}
      />
    </div>
  );
}

export default Input;
