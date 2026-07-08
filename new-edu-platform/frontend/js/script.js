

async function loadUsersCount() {
    try {
        const response = await fetch("/users-count");
        const data = await response.json();

        document.getElementById("usersCount").textContent = data.count;

    } catch (error) {
        console.log(error);
    }
}

loadUsersCount();

async function loadUsers() {
    try {
        const response = await fetch("/api/users");
        const users = await response.json();

        const table = document.getElementById("usersTable");

        table.innerHTML = "";

        users.forEach(user => {
            table.innerHTML += `
                <tr>
                    <td>${user.email}</td>
                    <td>${user.className}</td>
                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>

                    <td>
                        <button onclick="deleteUser('${user._id}')">
                            حذف
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.log(error);
    }
}




async function deleteUser(id) {
    const confirmDelete = confirm(
        "هل تريد حذف هذا المستخدم؟"
    );

    if (!confirmDelete) return;

    await fetch(`/api/users/${id}`, {
        method: "DELETE"
    });

    loadUsers();
}

loadUsers();

const form = document.getElementById("videoForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title =
        document.getElementById("title").value;

    const videoUrl =
        document.getElementById("videoUrl").value;

    const className =
        document.getElementById("videoClass").value;

    const subject =
        document.getElementById("videoSubject").value;

    const res = await fetch("/api/videos", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title,
            videoUrl,
            className,
            subject
        })
    });

    const data = await res.json();

    alert("تمت إضافة الفيديو");



    form.reset();
});

async function loadVideosTable() {

    const res = await fetch("/api/videos");
    const videos = await res.json();

    const tbody = document.getElementById("videosBody");

    tbody.innerHTML = "";

    videos.forEach(video => {

        tbody.innerHTML += `
        <tr>
            <td>${video.title}</td>
            <td>${video.className}</td>
            <td>${video.subject}</td>

            <td>
                <button
                class="delete-btn"
                onclick="deleteVideo('${video._id}')">
                    حذف
                </button>
            </td>
        </tr>
        `;

    });
}

loadVideosTable();

async function deleteVideo(id){

    const ok = confirm("هل تريد حذف الفيديو؟");

    if(!ok) return;

    await fetch(`/api/videos/${id}`,{
        method:"DELETE"
    });

    loadVideosTable();
}
