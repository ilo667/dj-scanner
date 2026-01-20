export default function ScanTracklist() {
    return (
        <div>
            <form className="w-2/3 m-auto">
                <textarea rows="15"
                          cols="30"
                          placeholder="Add tracklist"
                          className="peer mt-4 block w-full appearance-none rounded-md border
                          border-gray-400 pb-2 ps-4 pt-3 text-gray-900 placeholder-light-gray outline-none"
                ></textarea>
                <button
                    className="w-full rounded-[6px] bg-[#0057b8] p-4 text-center font-semibold text-white hover:bg-[#004590] mt-4"
                    type="submit"
                >
                    <span className="inline-block w-full">Scan playlist</span></button>
            </form>
        </div>
    );
}
